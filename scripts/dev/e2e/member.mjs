// LOCAL DEV/TEST ONLY: browser checks for saved jobs, companies, report form, student dashboard, admin overview.
import pg from "pg";
import { BASE, context, launch, tracker, watch } from "./helpers.mjs";
const t = tracker();
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/studojob_local" });
await db.connect();
await db.query("delete from saved_jobs where student_id in (select id from auth.users where email in ('student@test.local','student2@test.local'))");
await db.query("delete from reports where reporter_id in (select id from auth.users where email in ('student@test.local','student2@test.local'))");
const { rows: [job] } = await db.query("select id, title from jobs where status='published' order by published_at desc limit 1");
const { rows: [co] } = await db.query("select slug, name from companies where verification_status='approved' limit 1");
const browser = await launch();
try {
  // visitor
  let ctx = await context(browser); let page = await ctx.newPage(); let errs = watch(page);
  await page.goto(`${BASE}/jobs`); await page.getByRole("link", { name: "Sign in to save this opportunity" }).first().waitFor({ timeout: 8000 }).catch(() => {});
  t.check("visitor: save button asks to sign in", (await page.getByRole("link", { name: "Sign in to save this opportunity" }).count()) > 0);
  await page.goto(`${BASE}/report?job=${job.id}`);
  await page.getByText("to send a report").waitFor({ timeout: 8000 }).catch(() => {});
  t.check("visitor: report page asks to sign in", (await page.getByText("to send a report").count()) === 1);
  await page.goto(`${BASE}/report`);
  t.check("report without a listing explains what to do", (await page.getByText("Open the listing you want to report").count()) === 1);
  await page.goto(`${BASE}/companies`); await page.locator("article").first().waitFor({ timeout: 8000 }).catch(() => {});
  const nCompanies = await page.locator("article").count();
  t.check("companies list shows real companies", nCompanies >= 1, `count=${nCompanies}`);
  t.check("companies list has no 'Preview data' banner", (await page.getByText("Preview data").count()) === 0);
  await page.goto(`${BASE}/companies/${co.slug}`); await page.getByRole("heading", { name: co.name }).waitFor({ timeout: 8000 }).catch(() => {});
  t.check("company page shows name and open roles", (await page.getByRole("heading", { name: co.name }).count()) === 1 && (await page.getByText(/Open roles \(\d+\)/).count()) === 1);
  await page.goto(`${BASE}/companies/does-not-exist`);
  await page.getByText(/could not be found/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  t.check("unknown company shows the not-found page", (await page.getByText(/could not be found/i).count()) >= 1 && (await page.getByText(/Open roles/).count()) === 0);
  t.check("no console errors (visitor)", errs.length === 0, errs.join(" | "));
  await ctx.close();

  // student
  ctx = await context(browser, "student@test.local"); page = await ctx.newPage(); errs = watch(page);
  await page.goto(`${BASE}/student`); await page.getByText("Saved opportunities").first().waitFor({ timeout: 10000 }).catch(() => {});
  t.check("dashboard: shows real zero applications", (await page.getByText("Applications sent").count()) === 1);
  t.check("dashboard: lists opportunities", (await page.locator("article").count()) >= 1);
  t.check("dashboard: no sample-data wording", (await page.getByText(/sample/i).count()) === 0);
  await page.goto(`${BASE}/jobs`);
  const saveBtn = page.getByRole("button", { name: "Save opportunity" }).first();
  await saveBtn.waitFor({ timeout: 8000 }).catch(() => {});
  await saveBtn.click();
  await page.getByRole("button", { name: "Remove from saved" }).first().waitFor({ timeout: 8000 }).catch(() => {});
  t.check("student: save toggles on", (await page.getByRole("button", { name: "Remove from saved" }).count()) >= 1);
  await page.waitForTimeout(600);
  const { rows: [{ n }] } = await db.query("select count(*)::int n from saved_jobs where student_id=(select id from auth.users where email='student@test.local')");
  t.check("student: saved row exists in the database", n === 1, `rows=${n}`);
  await page.reload(); await page.getByRole("button", { name: "Remove from saved" }).first().waitFor({ timeout: 8000 }).catch(() => {});
  t.check("student: saved state survives reload", (await page.getByRole("button", { name: "Remove from saved" }).count()) === 1);
  await page.goto(`${BASE}/student/saved`); await page.locator("article").first().waitFor({ timeout: 8000 }).catch(() => {});
  t.check("saved page lists the saved job", (await page.locator("article").count()) === 1);
  await page.goto(`${BASE}/student`); await page.getByText("Saved opportunities").first().waitFor({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(1600); // count-up
  t.check("dashboard saved count is 1", (await page.locator("div", { hasText: /^Saved opportunities/ }).filter({ hasText: "1" }).count()) >= 1);
  await page.goto(`${BASE}/student/saved`);
  await page.getByRole("button", { name: "Remove from saved" }).first().click();
  await page.waitForTimeout(800); await page.reload(); await page.getByText("Nothing saved yet").waitFor({ timeout: 8000 }).catch(() => {});
  t.check("removing from saved empties the page", (await page.getByText("Nothing saved yet").count()) === 1);
  // report flow
  await page.goto(`${BASE}/report?job=${job.id}`); await page.getByRole("button", { name: "Send report" }).waitFor({ timeout: 8000 }).catch(() => {});
  await page.getByRole("button", { name: "Send report" }).click();
  t.check("report: empty form shows validation", (await page.getByText("Choose the closest reason.").count()) === 1);
  await page.getByLabel("What is wrong?").selectOption("asks_for_money");
  await page.getByLabel("Details").fill("They asked me to pay a registration fee.");
  await page.getByRole("button", { name: "Send report" }).click();
  await page.getByText("Your report was sent").waitFor({ timeout: 8000 }).catch(() => {});
  t.check("report: accepted", (await page.getByText("Your report was sent").count()) === 1);
  const { rows: [{ r }] } = await db.query("select count(*)::int r from reports where job_id=$1 and status='open'", [job.id]);
  t.check("report: row stored as open", r >= 1);
  await page.goto(`${BASE}/report?job=${job.id}`); await page.getByRole("button", { name: "Send report" }).waitFor({ timeout: 8000 }).catch(() => {});
  await page.getByLabel("What is wrong?").selectOption("other");
  await page.getByLabel("Details").fill("Second report that should be refused politely.");
  await page.getByRole("button", { name: "Send report" }).click();
  await page.getByText("You have already reported this listing").waitFor({ timeout: 8000 }).catch(() => {});
  t.check("report: duplicate refused politely", (await page.getByText("You have already reported this listing").count()) === 1);
  t.check("no console errors (student)", errs.length === 0, errs.join(" | "));
  await ctx.close();

  // profile (student2 so the earlier student state is untouched)
  ctx = await context(browser, "student2@test.local"); page = await ctx.newPage(); errs = watch(page);
  await db.query("delete from student_skills where student_id=(select id from auth.users where email='student2@test.local')");
  await db.query("delete from student_profiles where profile_id=(select id from auth.users where email='student2@test.local')");
  await page.goto(`${BASE}/student/profile`); await page.getByLabel("College / university").waitFor({ timeout: 10000 }).catch(() => {});
  await page.getByLabel("College / university").fill("");
  await page.getByRole("button", { name: "Save profile" }).click();
  t.check("profile: missing college is flagged", (await page.getByText("Enter your college or university.").count()) === 1);
  await page.getByLabel("College / university").fill("Test Deemed University");
  await page.getByLabel("Degree and branch").fill("B.Tech, AI & Data Science");
  await page.getByLabel("Headline").fill("Aspiring data scientist");
  await page.getByLabel("Graduation year").selectOption("2029");
  for (const sk of ["Python", "SQL", "Pandas", "Statistics", "Brandnewskill"]) { await page.locator("#skill").fill(sk); await page.locator("#skill").press("Enter"); }
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByText("Profile saved.").waitFor({ timeout: 8000 }).catch(() => {});
  t.check("profile: saved message", (await page.getByText("Profile saved.").count()) === 1);
  const { rows: [sp] } = await db.query("select college, degree, graduation_year, headline from student_profiles where profile_id=(select id from auth.users where email='student2@test.local')");
  t.check("profile: row stored in database", sp?.college === "Test Deemed University" && sp?.graduation_year === 2029 && sp?.headline === "Aspiring data scientist", JSON.stringify(sp));
  const { rows: sk } = await db.query("select s.name from student_skills ss join skills s on s.id=ss.skill_id where ss.student_id=(select id from auth.users where email='student2@test.local') order by 1");
  t.check("profile: 5 skills stored (existing reused, new created)", sk.length === 5 && sk.some((r) => r.name === "Brandnewskill"), sk.map((r) => r.name).join(","));
  await page.reload(); await page.getByLabel("College / university").waitFor({ timeout: 8000 }).catch(() => {});
  t.check("profile: values survive reload", (await page.getByLabel("College / university").inputValue()) === "Test Deemed University" && (await page.getByRole("list", { name: "Your skills" }).locator("li").count()) === 5);
  await page.getByRole("button", { name: "Remove Python" }).click();
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByText("Profile saved.").waitFor({ timeout: 8000 }).catch(() => {});
  const { rows: sk2 } = await db.query("select count(*)::int n from student_skills where student_id=(select id from auth.users where email='student2@test.local')");
  t.check("profile: removing a skill is saved", sk2[0].n === 4, `n=${sk2[0].n}`);
  await page.goto(`${BASE}/student`); await page.getByText("Complete your profile").waitFor({ timeout: 8000 }).catch(() => {});
  t.check("dashboard: education checklist item is now done", (await page.getByText("Add your education").count()) === 1 && (await page.locator("li", { hasText: "Add your education" }).locator("[aria-label='Done']").count()) === 1);
  t.check("dashboard: recommendations are matched on skills", (await page.getByText(/Matched on your skills/).count()) === 1 || (await page.getByText("Recommended for you").count()) === 0);
  t.check("no console errors (profile)", errs.length === 0, errs.join(" | "));
  await ctx.close();

  // employer
  ctx = await context(browser, "employer@test.local"); page = await ctx.newPage();
  await page.goto(`${BASE}/jobs`); await page.locator("article").first().waitFor({ timeout: 8000 }).catch(() => {});
  t.check("employer: no save button", (await page.getByRole("button", { name: /save/i }).count()) === 0 && (await page.getByRole("link", { name: /sign in to save/i }).count()) === 0);
  await ctx.close();

  // admin
  ctx = await context(browser, "admin@test.local"); page = await ctx.newPage(); errs = watch(page);
  await page.goto(`${BASE}/admin`); await page.getByText("Platform overview").waitFor({ timeout: 10000 }).catch(() => {});
  const { rows: [{ pub }] } = await db.query("select count(*)::int pub from jobs where status='published'");
  const { rows: [{ open }] } = await db.query("select count(*)::int open from reports where status in ('open','investigating')");
  await page.waitForTimeout(1600); // numbers on the dashboard count up from 0 when they scroll into view
  const body = await page.locator("body").innerText();
  const num = (label) => Number(new RegExp(`${label}\\s+(\\d+)`).exec(body)?.[1] ?? -1);
  t.check(`admin: published listings = ${pub}`, num("Published listings") === pub, `shown=${num("Published listings")}`);
  t.check(`admin: open reports = ${open}`, num("Open reports") === open, `shown=${num("Open reports")}`);
  t.check("admin: no sample wording", (await page.getByText(/sample/i).count()) === 0);
  t.check("no console errors (admin)", errs.length === 0, errs.join(" | "));
  await ctx.close();
} finally { await browser.close(); await db.end(); }
process.exit(t.done() ? 0 : 1);
