// LOCAL DEV/TEST ONLY: the admin "Publish" button and student skills on a database that HAS migration 009.
// Start the stack with:  WITH_009=1 bash scripts/dev/up.sh   (stand-in = my imitation of Supabase, not the real one)
import pg from "pg";
import { BASE, context, launch, tracker, watch } from "./helpers.mjs";

const t = tracker();
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/studojob_local" });
await db.connect();
const q = async (sql, p = []) => (await db.query(sql, p)).rows;
const uid = async (email) => (await q("select id from auth.users where email=$1", [email]))[0].id;
async function until(fn, ms = 12000) { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; }

t.check("database has migration 009 (approve_job exists)", (await q("select count(*)::int n from pg_proc where proname='approve_job'"))[0].n === 1);
const employer = await uid("employer@test.local");
const student = await uid("student@test.local");
await q("delete from companies where slug='e8-unverified-co'");
const [{ id: co }] = await q("insert into companies (owner_id, name, slug, verification_status) values ($1, 'E8 Unverified Co', 'e8-unverified-co', 'pending') returning id", [employer]);
const mkJob = async (title) => (await q(`insert into jobs (company_id, title, summary, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, pay_period, status, created_by)
  values ($1, $2, 'Waiting for a moderator to review this role.', 'internship', 'remote', 'full_time', 'internship', 'Remote', true, 1, 2, 'month', 'pending_review', $3) returning id, content_version`, [co, title, employer]))[0];
const j1 = await mkJob("E8 Moderation Role One");
const j2 = await mkJob("E8 Moderation Role Two");
t.check("setup: listings wait for review and carry a version", Number.isInteger(j1.content_version) && Number.isInteger(j2.content_version), JSON.stringify([j1, j2]));

const browser = await launch();
try {
  const ctx = await context(browser, "admin@test.local");
  const page = await ctx.newPage();
  const errs = watch(page);
  await page.goto(`${BASE}/admin/moderation`);
  await page.getByText("E8 Moderation Role One").waitFor({ timeout: 10000 });

  // 1. normal approval goes through approve_job
  const card1 = page.locator("div", { hasText: "E8 Moderation Role One" }).filter({ has: page.getByRole("button", { name: "Publish" }) }).last();
  await card1.getByRole("button", { name: "Publish" }).click();
  await until(async () => (await q("select status from jobs where id=$1", [j1.id]))[0].status === "published");
  t.check("admin: Publish works on a database with 009", (await q("select status from jobs where id=$1", [j1.id]))[0].status === "published");
  const ap = await q("select approval_source, content_version from private.job_approvals where job_id=$1", [j1.id]);
  t.check("admin: the approval is recorded for exactly the reviewed version", ap.length === 1 && ap[0].approval_source === "admin_review" && ap[0].content_version === j1.content_version, JSON.stringify(ap));
  t.check("public: the approved listing is visible to a visitor", (await (await context(browser)).request.get(`${BASE}/jobs/${j1.id}`)).status() === 200);

  // 2. the listing is edited after the admin opened the page: Publish must be refused
  await q("update jobs set title='E8 Moderation Role Two (edited)' where id=$1", [j2.id]);
  const card2 = page.locator("div", { hasText: "E8 Moderation Role Two" }).filter({ has: page.getByRole("button", { name: "Publish" }) }).last();
  await card2.getByRole("button", { name: "Publish" }).click();
  await page.getByText(/changed after you opened it/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  t.check("admin: a listing edited after the page loaded is NOT published", (await q("select status from jobs where id=$1", [j2.id]))[0].status === "pending_review" && (await page.getByText(/changed after you opened it/i).count()) >= 1);
  await page.reload();
  const card3 = page.locator("div", { hasText: "E8 Moderation Role Two (edited)" }).filter({ has: page.getByRole("button", { name: "Publish" }) }).last();
  await card3.getByRole("button", { name: "Publish" }).click();
  await until(async () => (await q("select status from jobs where id=$1", [j2.id]))[0].status === "published");
  t.check("admin: after reloading, the latest version can be published", (await q("select status from jobs where id=$1", [j2.id]))[0].status === "published");
  t.check("admin: no console errors", errs.length === 0, errs.join(" | "));
  await ctx.close();

  // 3. student adds an unlisted skill: the rest of the profile still saves
  await q("delete from student_skills where student_id=$1", [student]);
  await q("delete from skills where name ilike 'Zzz%'");
  const sctx = await context(browser, "student@test.local");
  const sp = await sctx.newPage();
  const serrs = watch(sp);
  await sp.goto(`${BASE}/student/profile`);
  await sp.locator("#skill").waitFor({ timeout: 10000 });
  if (!(await sp.getByLabel("College / university").inputValue())) await sp.getByLabel("College / university").fill("Test University");
  await sp.locator("#skill").fill("ZzzUnlistedSkill");
  await sp.locator("#skill").press("Enter");
  const known = (await q("select name from skills order by name limit 1"))[0].name;
  await sp.locator("#skill").fill(known);
  await sp.locator("#skill").press("Enter");
  await sp.getByRole("button", { name: "Save profile" }).click();
  await sp.getByText(/Profile saved/).first().waitFor({ timeout: 10000 }).catch(() => {});
  const text = await sp.locator("body").innerText();
  t.check("student: profile saves and names the skill that was not added", /not in our list yet/.test(text) && text.includes("ZzzUnlistedSkill"), text.slice(0, 200));
  const have = await q("select s.name from student_skills ss join skills s on s.id=ss.skill_id where ss.student_id=$1", [student]);
  t.check("student: the catalogue skill was saved, the unlisted one was not created", have.some((r) => r.name === known) && !have.some((r) => /^Zzz/.test(r.name)) && (await q("select count(*)::int n from skills where name ilike 'Zzz%'"))[0].n === 0, JSON.stringify(have));
  t.check("student: no console errors", serrs.length === 0, serrs.join(" | "));
} finally {
  await browser.close();
  await db.end();
}
process.exit(t.done() ? 0 : 1);
