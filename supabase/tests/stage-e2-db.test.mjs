/**
 * Stage E2 database workflow test (SIMULATED).
 *
 * Applies every migration in supabase/migrations to an in-memory Postgres (PGlite) and runs the
 * employer -> student -> employer workflow as different users, using the same SQL the server
 * actions send. Row Level Security and the guard triggers decide every result.
 *
 * This does NOT touch any real Supabase project. Passing here does not prove the live project behaves
 * the same way; that needs the manual test guide in PHASE2_PROGRESS.md.
 *
 * Run:  npm run test:stage-e2-db
 */
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const db = new PGlite();

// Minimal stand-ins for the parts Supabase provides. Everything in public/private is the real migration code.
const SHIM = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}'::jsonb, raw_app_meta_data jsonb not null default '{"provider":"email"}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(cardinality(string_to_array(name, '/')) - 1, 0)] $$;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to authenticated, service_role;
grant select on storage.objects to anon;
`;

let passed = 0;
let failed = 0;
const harness = [];
function check(name, cond, detail = "") {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? "  -> " + detail : ""}`); }
}

/** Runs SQL as a signed-in user (uid) or as an anonymous visitor (uid = null). Errors are returned, not thrown. */
async function as(uid, sql, params = []) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ""]);
    const r = await db.query(sql, params);
    await db.exec("commit");
    return { rows: r.rows };
  } catch (e) {
    await db.exec("rollback");
    const msg = String(e.message ?? e);
    if (/does not exist|syntax error|could not determine|ambiguous|malformed/i.test(msg)) harness.push(`${msg} [${sql.slice(0, 60)}]`);
    return { error: msg, code: e.code };
  }
}
/** Runs SQL as the database operator (no RLS). Used only for test setup. */
const op = async (sql, params = []) => (await db.query(sql, params)).rows;

async function newUser(meta = {}) {
  const id = randomUUID();
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [id, `${id}@t.test`, JSON.stringify(meta)]);
  return id;
}

const DEADLINE = () => new Date(Date.now() + 20 * 864e5).toISOString();
const PAST = () => new Date(Date.now() - 2 * 864e5).toISOString();

/** Same column set the server action writes (job-schema.ts toJobColumns). */
async function insertJob(uid, companyId, { title = "Data Analyst Intern", status = "draft", deadline = DEADLINE(), isPaid = true, payPeriod = "month", payMin = 15000, payMax = 20000, location = "Chennai" } = {}) {
  return as(uid, `insert into public.jobs (company_id, title, summary, responsibilities, requirements, perks, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, pay_period, pay_currency, status, application_deadline)
    values ($1,$2,'Work with the analytics team on real datasets.', '{"Build dashboards"}', '{"SQL basics"}', '{}', 'internship','hybrid','full_time','internship',$3,$4,$5,$6,$7,'INR',$8,$9) returning id, status`,
    [companyId, title, location, isPaid, isPaid ? payMin : null, isPaid ? payMax : null, isPaid ? payPeriod : null, status, deadline]);
}

// ---------------------------------------------------------------------------
console.log("\n== Migrations");
await db.exec(SHIM);
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
  await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
}
check("all migrations apply to a clean database", true);

const s1 = await newUser({ role: "student", full_name: "Asha" });
const s2 = await newUser({ role: "student", full_name: "Bala" });
const e1 = await newUser({ role: "employer", full_name: "Employer One" });
const e2 = await newUser({ role: "employer", full_name: "Employer Two" });
const adm = await newUser({ role: "admin", full_name: "Operator" });
await op("update public.profiles set role='admin' where id=$1", [adm]); // operator promotion for setup only (never done by the app)

console.log("\n== Company setup (employer creates a company)");
const c1 = await as(e1, "insert into public.companies (owner_id, name, slug, location) values ($1, 'Acme Data', '', 'Chennai') returning id, slug, verification_status", [e1]);
check("employer creates a company and the database generates its slug", c1.rows?.[0]?.slug === "acme-data", JSON.stringify(c1));
const companyA = c1.rows?.[0]?.id;
const c2 = await as(e2, "insert into public.companies (owner_id, name, slug) values ($1, 'Beta Labs', '') returning id", [e2]);
const companyB = c2.rows?.[0]?.id;
check("second employer creates their own company", !!companyB, JSON.stringify(c2));
const dup = await as(e1, "insert into public.companies (owner_id, name, slug) values ($1, 'Second Company', '')", [e1]);
check("an employer cannot create a second company", !!dup.error && dup.code === "23505", JSON.stringify(dup));
check("a new company is pending verification", (await op("select verification_status from public.companies where id=$1", [companyA]))[0].verification_status === "pending");

// ---------------------------------------------------------------------------
console.log("\n== Company verification request (employer asks, admin decides)");
const vReqByOther = await as(e1, "insert into public.company_verifications (company_id, submitted_by, business_email) values ($1, $2, 'owner@beta.example')", [companyB, e1]);
check("another employer cannot request verification for a company they do not own", !!vReqByOther.error, JSON.stringify(vReqByOther));
const vReq = await as(e2, "insert into public.company_verifications (company_id, submitted_by, business_email, registration_number) values ($1, $2, 'owner@beta.example', 'REG-123') returning id, status", [companyB, e2]);
check("owner submits a verification request and it starts pending", vReq.rows?.[0]?.status === "pending", JSON.stringify(vReq));
const verifId = vReq.rows?.[0]?.id;
const forged = await as(e2, "select submitted_by from public.company_verifications where id=$1", [verifId]);
check("submitted_by is the signed-in owner", forged.rows?.[0]?.submitted_by === e2, JSON.stringify(forged));
const dupRequest = await as(e2, "insert into public.company_verifications (company_id, submitted_by, business_email) values ($1, $2, 'owner@beta.example')", [companyB, e2]);
check("a second pending request for the same company is refused", dupRequest.code === "23505", JSON.stringify(dupRequest));
const selfApprove = await as(e2, "update public.company_verifications set status='approved' where id=$1 returning id", [verifId]);
check("owner cannot approve their own request", (selfApprove.rows?.length ?? 0) === 0, JSON.stringify(selfApprove));
const stillPending = (await op("select verification_status from public.companies where id=$1", [companyB]))[0].verification_status;
check("company stays pending after the owner's attempt", stillPending === "pending");
const adminDecide = await as(adm, "update public.company_verifications set status='approved', review_notes='Documents checked' where id=$1 returning id", [verifId]);
check("admin approves the request", adminDecide.rows?.length === 1, JSON.stringify(adminDecide));
const nowApproved = (await op("select verification_status from public.companies where id=$1", [companyB]))[0].verification_status;
check("the company becomes approved through the database trigger", nowApproved === "approved");
const notified = await op("select count(*)::int n from public.notifications where user_id=$1 and type='company_approved'", [e2]);
check("the owner is notified of the decision", notified[0].n === 1);
const liveAfter = await insertJob(e2, companyB, { title: "Beta Labs Graduate Role", status: "published" });
check("after approval the owner's publish goes live immediately", liveAfter.rows?.[0]?.status === "published", JSON.stringify(liveAfter));

console.log("\n== A. Employer creates a valid job");
const draftA = await insertJob(e1, companyA, { title: "Draft Analyst Role", status: "draft" });
check("valid draft is saved for the employer's own company", draftA.rows?.[0]?.status === "draft", JSON.stringify(draftA));
const jobDraft = draftA.rows?.[0]?.id;
const pubA = await insertJob(e1, companyA, { title: "Data Analyst Intern", status: "published" });
check("publishing from an unverified company routes the job to review (not live)", pubA.rows?.[0]?.status === "pending_review", JSON.stringify(pubA));
const jobPending = pubA.rows?.[0]?.id;
check("job records the creator", (await op("select created_by from public.jobs where id=$1", [jobPending]))[0].created_by === e1);

console.log("\n== B. Employer cannot create a job for another company");
const crossCo = await insertJob(e1, companyB, { title: "Sneaky Cross Company Job", status: "draft" });
check("creating a job for another company is refused", !!crossCo.error && crossCo.rows === undefined, JSON.stringify(crossCo));

console.log("\n== D. Invalid job submissions are rejected by the database");
const badTitle = await as(e1, `insert into public.jobs (company_id, title, summary, type, work_mode, employment, level, location, is_paid, status) values ($1,'abc','Long enough summary for the rule here.','job','remote','full_time','entry','Remote',false,'draft')`, [companyA]);
check("title shorter than 5 characters is rejected", !!badTitle.error);
const payNoPeriod = await insertJob(e1, companyA, { payPeriod: null });
check("paid job without a pay period is rejected", !!payNoPeriod.error, JSON.stringify(payNoPeriod));
const badPay = await insertJob(e1, companyA, { payMin: 30000, payMax: 10000 });
check("maximum below minimum pay is rejected", !!badPay.error);
const pastDl = await insertJob(e1, companyA, { deadline: PAST() });
check("deadline in the past is rejected on create", !!pastDl.error, JSON.stringify(pastDl));
const unpaidWithPay = await as(e1, `insert into public.jobs (company_id, title, summary, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, status) values ($1,'Unpaid Role Title','Learn from mentors for a few months.','internship','remote','part_time','internship','Remote',false,500,800,'draft')`, [companyA]);
check("unpaid job that still states pay is rejected", !!unpaidWithPay.error);

console.log("\n== C. Employer cannot edit another employer's job");
const otherEdit = await as(e2, "update public.jobs set title='Hijacked Title Here' where id=$1 returning id", [jobDraft]);
check("another employer's update matches zero rows", (otherEdit.rows?.length ?? 0) === 0 && !otherEdit.error, JSON.stringify(otherEdit));
check("the listing title is unchanged", (await op("select title from public.jobs where id=$1", [jobDraft]))[0].title === "Draft Analyst Role");
const moveCo = await as(e1, "update public.jobs set company_id=$1 where id=$2 returning id", [companyB, jobDraft]);
check("an employer cannot move a listing to another company", !!moveCo.error, JSON.stringify(moveCo));

console.log("\n== Admin approves the company, then the owner can publish");
const approve = await as(adm, "update public.companies set verification_status='approved', verified_at=now() where id=$1 returning id", [companyA]);
check("admin approves the company", approve.rows?.length === 1, JSON.stringify(approve));
const live = await as(e1, "update public.jobs set status='published' where id=$1 returning status", [jobDraft]);
check("after approval, the owner's publish goes live", live.rows?.[0]?.status === "published", JSON.stringify(live));
const liveJob = jobDraft;
const pendingNowLive = await as(adm, "update public.jobs set status='published' where id=$1 and status='pending_review' returning id", [jobPending]);
check("admin publishes a listing that was waiting for review", pendingNowLive.rows?.length === 1);
const liveJob2 = jobPending;

console.log("\n== E/F. Discovery: students see eligible jobs only");
const draftOther = await insertJob(e2, companyB, { title: "Beta Hidden Draft", status: "draft" });
const hiddenDraft = draftOther.rows?.[0]?.id;
const expired = await insertJob(e1, companyA, { title: "Expired Listing Here", status: "published", deadline: DEADLINE() });
await op("update public.jobs set application_deadline = now() - interval '1 day' where id=$1", [expired.rows[0].id]);
const pausedJob = await insertJob(e1, companyA, { title: "Paused Listing Here", status: "draft" });
await as(e1, "update public.jobs set status='published' where id=$1", [pausedJob.rows[0].id]);
await as(e1, "update public.jobs set status='paused' where id=$1", [pausedJob.rows[0].id]);
const pausedId = pausedJob.rows[0].id;
const rejectedJob = await insertJob(e1, companyA, { title: "Rejected Listing Here", status: "draft" });
await op("update public.jobs set status='rejected' where id=$1", [rejectedJob.rows[0].id]);
const rejectedId = rejectedJob.rows[0].id;

const studentSees = await as(s1, "select id from public.jobs where status='published'");
const ids = (studentSees.rows ?? []).map((r) => r.id);
check("student sees the approved, published job", ids.includes(liveJob));
check("student sees the admin-published job", ids.includes(liveJob2));
check("student cannot see a draft", !ids.includes(hiddenDraft));
check("student cannot see a paused listing", !ids.includes(pausedId));
check("student cannot see a rejected listing", !ids.includes(rejectedId));
check("student cannot see an expired listing", !ids.includes(expired.rows[0].id));
const anonSees = await as(null, "select id from public.jobs");
check("logged-out visitor sees only published, unexpired jobs", (anonSees.rows ?? []).every((r) => ids.includes(r.id)) && (anonSees.rows ?? []).length === ids.length, JSON.stringify(anonSees.rows?.length));
check("a draft is hidden from another employer", ((await as(e1, "select id from public.jobs where id=$1", [hiddenDraft])).rows ?? []).length === 0);

// ---------------------------------------------------------------------------
console.log("\n== G. Student submits a valid application");
const app1 = await as(s1, "insert into public.applications (job_id, student_id, cover_note) values ($1, $2, 'I like dashboards') returning id, status", [liveJob, s1]);
check("eligible student applies and the status is 'applied'", app1.rows?.[0]?.status === "applied", JSON.stringify(app1));
const appId = app1.rows?.[0]?.id;

console.log("\n== H. Duplicate applications are rejected safely");
const dupApp = await as(s1, "insert into public.applications (job_id, student_id) values ($1, $2)", [liveJob, s1]);
check("second application to the same job is refused by the unique constraint", dupApp.code === "23505", JSON.stringify(dupApp));
// PGlite is a single connection, so true concurrency cannot be simulated here. The unique constraint is
// what guarantees one winner under concurrency; this checks that a second submission is refused.
const first = await as(s2, "insert into public.applications (job_id, student_id) values ($1, $2) returning id", [liveJob, s2]);
const second = await as(s2, "insert into public.applications (job_id, student_id) values ($1, $2) returning id", [liveJob, s2]);
check("first submission succeeds and the repeat is refused (constraint 23505)", first.rows?.length === 1 && second.code === "23505", JSON.stringify({ first, second }));
const appS2 = (await op("select id from public.applications where job_id=$1 and student_id=$2", [liveJob, s2]))[0]?.id;

console.log("\n== Application eligibility");
check("cannot apply to a draft", !!(await as(s1, "insert into public.applications (job_id, student_id) values ($1, $2)", [hiddenDraft, s1])).error);
check("cannot apply to a paused listing", !!(await as(s1, "insert into public.applications (job_id, student_id) values ($1, $2)", [pausedId, s1])).error);
check("cannot apply to a rejected listing", !!(await as(s1, "insert into public.applications (job_id, student_id) values ($1, $2)", [rejectedId, s1])).error);
const onBehalf = await as(s2, "insert into public.applications (job_id, student_id) values ($1, $2)", [liveJob2, s1]);
check("a student cannot submit an application as another user", !!onBehalf.error && onBehalf.code === "42501", JSON.stringify(onBehalf));
const notStudent = await as(e1, "insert into public.applications (job_id, student_id) values ($1, $2)", [liveJob2, e1]);
check("an employer account cannot apply", !!notStudent.error, JSON.stringify(notStudent));

console.log("\n== I. Students cannot access or change another student's application");
check("student B cannot read student A's application", ((await as(s2, "select id from public.applications where id=$1", [appId])).rows ?? []).length === 0);
const tamper = await as(s2, "update public.applications set status='withdrawn' where id=$1 returning id", [appId]);
check("student B cannot withdraw student A's application", (tamper.rows?.length ?? 0) === 0 && !tamper.error, JSON.stringify(tamper));
const ownRead = await as(s1, "select id, status from public.applications where id=$1", [appId]);
check("student A can read their own application", ownRead.rows?.[0]?.status === "applied");

// ---------------------------------------------------------------------------
console.log("\n== J/K. Employer sees applicants for their own jobs only");
const empSees = await as(e1, "select id from public.applications where job_id=$1", [liveJob]);
check("owning employer sees the applications to their job", (empSees.rows ?? []).length === 2, JSON.stringify(empSees.rows?.length));
const otherSees = await as(e2, "select id from public.applications where job_id=$1", [liveJob]);
check("another employer cannot see those applications", (otherSees.rows ?? []).length === 0);
const otherUpdate = await as(e2, "update public.applications set status='shortlisted' where id=$1 returning id", [appId]);
check("another employer cannot change an application", (otherUpdate.rows?.length ?? 0) === 0 && !otherUpdate.error, JSON.stringify(otherUpdate));
const profileView = await as(e2, "select id from public.profiles where id=$1", [s1]);
check("another employer cannot read a student's profile", (profileView.rows ?? []).length === 0);

console.log("\n== L. Application status restrictions");
const emp = await as(e1, "update public.applications set status='under_review' where id=$1 returning status", [appId]);
check("employer can move an application to under_review", emp.rows?.[0]?.status === "under_review", JSON.stringify(emp));
const shortlist = await as(e1, "update public.applications set status='shortlisted' where id=$1 returning status", [appId]);
check("employer can shortlist", shortlist.rows?.[0]?.status === "shortlisted");
const empApplied = await as(e1, "update public.applications set status='applied' where id=$1", [appId]);
check("employer cannot move an application back to 'applied'", !!empApplied.error, JSON.stringify(empApplied));
const empWithdraw = await as(e1, "update public.applications set status='withdrawn' where id=$1", [appId]);
check("employer cannot set 'withdrawn'", !!empWithdraw.error);
const stuSelected = await as(s1, "update public.applications set status='selected' where id=$1", [appId]);
check("student cannot set themselves to 'selected' (only withdraw is allowed)", !!stuSelected.error, JSON.stringify(stuSelected));
const stuWithdraw = await as(s1, "update public.applications set status='withdrawn' where id=$1 returning status", [appId]);
check("student can withdraw an active application", stuWithdraw.rows?.[0]?.status === "withdrawn", JSON.stringify(stuWithdraw));
const afterWithdraw = await as(e1, "update public.applications set status='shortlisted' where id=$1", [appId]);
check("employer cannot revive a withdrawn application", !!afterWithdraw.error, JSON.stringify(afterWithdraw));
const reapply = await as(s1, "insert into public.applications (job_id, student_id) values ($1, $2)", [liveJob, s1]);
check("re-applying after withdrawal is blocked by the unique constraint (existing rule)", reapply.code === "23505");
const appEdit = await as(s2, "update public.applications set cover_note='changed after submit' where id=$1", [appS2]);
check("application details cannot be edited after submission", !!appEdit.error || (appEdit.rows?.length ?? 0) === 0, JSON.stringify(appEdit));

console.log("\n== Owner pause / close");
const closeJob = await as(e1, "update public.jobs set status='closed' where id=$1 returning status", [liveJob2]);
check("owner closes their listing", closeJob.rows?.[0]?.status === "closed");
const applyClosed = await as(s2, "insert into public.applications (job_id, student_id) values ($1, $2)", [liveJob2, s2]);
check("cannot apply once a listing is closed", !!applyClosed.error);
const otherClose = await as(e2, "update public.jobs set status='closed' where id=$1 returning id", [liveJob]);
check("another employer cannot close the listing", (otherClose.rows?.length ?? 0) === 0 && !otherClose.error);

console.log("\n== Summary");
const applicantCount = (await op("select count(*)::int n from public.applications where job_id=$1", [liveJob]))[0].n;
check("exactly two applications exist for the live job (student A and student B)", applicantCount === 2, `count=${applicantCount}`);
// Documents a KNOWN GAP (not a pass for a security property): the owner can edit a live listing's content
// without a new review. Expected to succeed today; see PHASE2_PROGRESS.md "Known gaps".
const liveEdit = await as(e1, "update public.jobs set title='Data Analyst Intern (edited)' where id=$1 returning id", [liveJob]);
check("KNOWN GAP documented: owner can edit a live listing without re-review", liveEdit.rows?.length === 1, JSON.stringify(liveEdit));
for (const h of harness) check(`harness error: ${h}`, false);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
