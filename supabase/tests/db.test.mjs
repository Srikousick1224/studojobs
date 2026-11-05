/**
 * StudoJob database security test.
 *
 * Applies every migration in supabase/migrations to an in-memory Postgres (PGlite),
 * then attacks it as different users. Nothing here touches a real Supabase project.
 *
 * Run:  npm run test:db
 *
 * NOTE: PGlite has no Supabase, so we build tiny stand-ins for the parts Supabase
 * provides (auth.users, auth.uid(), storage.objects, the anon/authenticated roles).
 * Everything in `public` and `private` is the REAL migration code.
 */
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const db = new PGlite();

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
function check(name, cond, detail = "") {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? "  -> " + detail : ""}`); }
}
const show = (r) => (r.error ? `error: ${r.error}` : `rows: ${JSON.stringify(r.rows)}`);

/** Run SQL as a logged-in user (uid) or as a logged-out visitor (uid = null). */
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
    // A typo in THIS test file must never be mistaken for the database "correctly denying" something.
    if (/does not exist|syntax error|invalid input|could not determine|ambiguous|malformed/i.test(msg)) {
      harnessErrors.push(`${msg}  [${sql.slice(0, 70).replace(/\s+/g, " ")}]`);
    }
    return { error: msg };
  }
}
const harnessErrors = [];
/** Run SQL as the database operator (superuser, no RLS). */
async function op(sql, params = []) {
  return (await db.query(sql, params)).rows;
}
async function newUser(meta = {}) {
  const id = randomUUID();
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [id, `${id}@t.test`, JSON.stringify(meta)]);
  return id;
}
const future = () => new Date(Date.now() + 14 * 864e5).toISOString();
const JOB = (company, extra = "") =>
  `insert into public.jobs (company_id, title, summary, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, pay_period${extra ? ", " + extra.split("=")[0] : ""})
   values ('${company}', 'Data Analyst Intern', 'Work with the analytics team on real datasets.', 'internship', 'hybrid', 'full_time', 'internship', 'Chennai', true, 15000, 20000, 'month'${extra ? ", " + extra.split("=")[1] : ""}) returning id, status`;

// ---------------------------------------------------------------------------
console.log("\n== Applying migrations to a clean database");
await db.exec(SHIM);
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
  try {
    await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
    check(`migration ${f}`, true);
  } catch (e) {
    check(`migration ${f}`, false, String(e.message));
    console.log("\nCannot continue: a migration failed.");
    process.exit(1);
  }
}
const tables = (await op("select count(*)::int n from pg_tables where schemaname='public'"))[0].n;
check("16 public tables exist", tables === 16, `found ${tables}`);
const noRls = await op("select tablename from pg_tables where schemaname='public' and not rowsecurity");
check("every public table has Row Level Security ON", noRls.length === 0, JSON.stringify(noRls));
check("reference data loaded (categories + skills)", (await op("select (select count(*) from public.job_categories) c, (select count(*) from public.skills) s"))[0].c > 0);
check("NO fake companies or jobs seeded", (await op("select (select count(*) from public.companies)+(select count(*) from public.jobs) n"))[0].n === 0);

// ---------------------------------------------------------------------------
console.log("\n== Signup and role safety");
const sneaky = await newUser({ role: "admin", full_name: "Sneaky" });
const s1 = await newUser({ role: "student", full_name: "Student One" });
const s2 = await newUser({ full_name: "Student Two" });
const s3 = await newUser({ role: "student", full_name: "Student Three" });
const e1 = await newUser({ role: "employer", full_name: "Employer One" });
const e2 = await newUser({ role: "employer", full_name: "Employer Two" });
const adm = await newUser({ full_name: "Operator" });
await op("update public.profiles set role='admin' where id=$1", [adm]); // operator-only path

const roleOf = async (id) => (await op("select role from public.profiles where id=$1", [id]))[0]?.role;
check("signup with role=admin becomes a STUDENT", (await roleOf(sneaky)) === "student");
check("signup with no role becomes a student", (await roleOf(s2)) === "student");
check("signup with role=employer becomes an employer", (await roleOf(e1)) === "employer");
check("student gets a student_profiles row", (await op("select count(*)::int n from public.student_profiles where profile_id=$1", [s1]))[0].n === 1);
check("employer gets an employer_profiles row", (await op("select count(*)::int n from public.employer_profiles where profile_id=$1", [e1]))[0].n === 1);

let r = await as(s1, "update public.profiles set role='admin' where id=$1", [s1]);
check("student cannot promote themselves to admin", !!r.error && (await roleOf(s1)) === "student", show(r));
r = await as(e1, "update public.profiles set is_suspended=false, role='admin' where id=$1", [e1]);
check("employer cannot promote themselves to admin", !!r.error && (await roleOf(e1)) === "employer", show(r));
r = await as(null, "select * from public.profiles");
check("logged-out visitor cannot read profiles", !!r.error, show(r));
r = await as(s1, "insert into public.profiles (id, role) values ($1, 'admin')", [randomUUID()]);
check("cannot insert a fake admin profile", !!r.error, show(r));

// ---------------------------------------------------------------------------
console.log("\n== Companies and verification");
r = await as(s1, "insert into public.companies (owner_id, name, slug) values ($1, 'Student Co', '')", [s1]);
check("a student cannot create a company", !!r.error, show(r));
r = await as(e1, "insert into public.companies (owner_id, name, slug, verification_status) values ($1, 'Brightpath Test Co', '', 'approved') returning id, slug, verification_status", [e1]);
check("employer creates a company; slug auto-generated", !r.error && r.rows[0].slug === "brightpath-test-co", show(r));
check("employer cannot create a company as pre-approved", r.rows?.[0]?.verification_status === "pending", show(r));
const c1 = r.rows[0].id;
r = await as(e2, "insert into public.companies (owner_id, name, slug) values ($1, 'Rival Co', '') returning id", [e2]);
check("a second employer creates their own company", !r.error, show(r));
check("employer profile is linked to the new company", (await op("select company_id from public.employer_profiles where profile_id=$1", [e1]))[0].company_id === c1);
await as(e1, "update public.companies set verification_status='approved' where id=$1", [c1]);
check("employer cannot verify their own company", (await op("select verification_status from public.companies where id=$1", [c1]))[0].verification_status === "pending");
r = await as(e2, "update public.companies set about='hacked' where id=$1", [c1]);
check("another employer cannot edit my company", (await op("select about from public.companies where id=$1", [c1]))[0].about !== "hacked", show(r));
r = await as(e2, "update public.companies set owner_id=$1 where id=$2", [e2, c1]);
check("company ownership cannot be stolen", (await op("select owner_id from public.companies where id=$1", [c1]))[0].owner_id === e1, show(r));
r = await as(null, "select id from public.companies");
check("logged-out visitors see NO unverified, job-less companies", !r.error && r.rows.length === 0, show(r));

// ---------------------------------------------------------------------------
console.log("\n== Job posting and moderation");
r = await as(e1, JOB(c1, "status='published'"));
check("unverified employer 'publish' goes to review queue instead", !r.error && r.rows[0].status === "pending_review", show(r));
const jobPending = r.rows[0].id;
r = await as(null, "select id from public.jobs");
check("logged-out visitors cannot see pending listings", !r.error && r.rows.length === 0, show(r));
r = await as(s1, JOB(c1));
check("student cannot post a job", !!r.error, show(r));
r = await as(e2, JOB(c1));
check("employer cannot post under someone else's company", !!r.error, show(r));
r = await as(e1, "insert into public.jobs (company_id, title, summary, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, pay_period) values ($1,'Unpaid With Pay','Unpaid role that wrongly lists a salary range.','internship','remote','part_time','internship','Remote', false, 1000, 2000, 'month')", [c1]);
check("unpaid role may not list pay (pay disclosure rule)", !!r.error, show(r));
r = await as(e1, "insert into public.jobs (company_id, title, summary, type, work_mode, employment, level, location, is_paid) values ($1,'Unpaid Design Intern','Learning-focused unpaid internship with weekly mentoring.','internship','remote','part_time','internship','Remote', false) returning id", [c1]);
check("honest unpaid role is accepted", !r.error, show(r));
r = await as(e1, `insert into public.jobs (company_id, title, summary, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, pay_period, application_deadline) values ($1,'Past Deadline Role','This deadline is already in the past.','job','remote','full_time','entry','Remote', true, 1, 2, 'month', now() - interval '1 day')`, [c1]);
check("deadline in the past is rejected", !!r.error, show(r));
r = await as(e1, "update public.jobs set status='rejected' where id=$1", [jobPending]);
check("employer cannot mark their own job 'rejected'", !!r.error, show(r));

// Admin verifies the company through the real verification flow
r = await as(e1, "insert into public.company_verifications (company_id, submitted_by, business_email, status) values ($1, $2, 'hr@brightpath-test.com', 'approved') returning id, status", [c1, e1]);
check("employer submits verification; forced to 'pending'", !r.error && r.rows[0].status === "pending", show(r));
const ver = r.rows[0].id;
await as(e1, "update public.company_verifications set status='approved' where id=$1", [ver]);
check("employer cannot approve their own verification", (await op("select status from public.company_verifications where id=$1", [ver]))[0].status === "pending");
r = await as(adm, "update public.company_verifications set status='approved', review_notes='Checked' where id=$1", [ver]);
check("admin approves the verification", !r.error && (await op("select verification_status from public.companies where id=$1", [c1]))[0].verification_status === "approved", show(r));
check("owner is notified of approval", (await op("select count(*)::int n from public.notifications where user_id=$1 and type='company_approved'", [e1]))[0].n === 1);

r = await as(e1, JOB(c1, "status='published'"));
check("verified employer publishes instantly", !r.error && r.rows[0].status === "published", show(r));
const job1 = r.rows[0].id;
r = await as(null, "select id from public.jobs where id=$1", [job1]);
check("logged-out visitors CAN see published jobs", !r.error && r.rows.length === 1, show(r));
r = await as(null, "select id from public.companies where id=$1", [c1]);
check("logged-out visitors CAN see verified companies", !r.error && r.rows.length === 1, show(r));
r = await as(e1, "update public.companies set name='Totally Different Name' where id=$1 returning verification_status", [c1]);
check("renaming an approved company resets it to pending", r.rows?.[0]?.verification_status === "pending", show(r));
await op("update public.companies set verification_status='approved' where id=$1", [c1]); // operator restores for the next tests

// ---------------------------------------------------------------------------
console.log("\n== Applications");
r = await as(null, "insert into public.applications (job_id, student_id) values ($1,$2)", [job1, s1]);
check("logged-out visitor cannot apply", !!r.error, show(r));
r = await as(e2, "insert into public.applications (job_id, student_id) values ($1,$2)", [job1, e2]);
check("an employer account cannot apply", !!r.error, show(r));
r = await as(s1, "insert into public.applications (job_id, student_id) values ($1,$2)", [job1, s2]);
check("student cannot apply on behalf of another student", !!r.error, show(r));
r = await as(s1, "insert into public.applications (job_id, student_id, status) values ($1,$2,'selected') returning id, status", [job1, s1]);
check("student applies; status forced to 'applied'", !r.error && r.rows[0].status === "applied", show(r));
const app1 = r.rows[0].id;
r = await as(s1, "insert into public.applications (job_id, student_id) values ($1,$2)", [job1, s1]);
check("DUPLICATE application is blocked", !!r.error, show(r));
r = await as(s1, "insert into public.applications (job_id, student_id) values ($1,$2)", [jobPending, s1]);
check("cannot apply to a listing that is not published", !!r.error, show(r));
check("employer got an 'application received' notification", (await op("select count(*)::int n from public.notifications where user_id=$1 and type='application_received'", [e1]))[0].n === 1);

// resume flow + storage
const path3 = `${s3}/cv.pdf`;
r = await as(s3, "insert into public.resumes (student_id,label,storage_path,file_name,mime_type,size_bytes,is_default) values ($1,'Main CV',$2,'cv.pdf','application/pdf',120000,true) returning id", [s3, path3]);
check("student saves resume metadata", !r.error, show(r));
const res3 = r.rows?.[0]?.id;
r = await as(s1, "insert into public.resumes (student_id,label,storage_path,file_name,mime_type,size_bytes) values ($1,'Evil',$2,'x.exe','application/x-msdownload',100)", [s1, `${s1}/x.exe`]);
check("invalid resume file type is rejected", !!r.error, show(r));
r = await as(s1, "insert into public.resumes (student_id,label,storage_path,file_name,mime_type,size_bytes) values ($1,'Huge',$2,'x.pdf','application/pdf',6000000)", [s1, `${s1}/huge.pdf`]);
check("resume over 5 MB is rejected", !!r.error, show(r));
r = await as(s3, "insert into storage.objects (bucket_id, name) values ('resumes', $1)", [path3]);
check("student uploads into their OWN resume folder", !r.error, show(r));
r = await as(s3, "insert into storage.objects (bucket_id, name) values ('resumes', $1)", [`${s1}/stolen.pdf`]);
check("student cannot upload into another student's folder", !!r.error, show(r));
r = await as(e1, "select name from storage.objects where bucket_id='resumes' and name=$1", [path3]);
check("employer CANNOT read a resume before the student applies", !r.error && r.rows.length === 0, show(r));
r = await as(s3, "insert into public.applications (job_id, student_id, resume_id) values ($1,$2,$3) returning id", [job1, s3, res3]);
check("student applies with a resume", !r.error, show(r));
r = await as(s1, "insert into public.applications (job_id, student_id, resume_id) values ($1,$2,$3)", [(await as(e1, JOB(c1, "status='published'"))).rows[0].id, s1, res3]);
check("cannot attach someone else's resume", !!r.error, show(r));
r = await as(e1, "select name from storage.objects where bucket_id='resumes' and name=$1", [path3]);
check("employer CAN read the resume attached to their applicant", !r.error && r.rows.length === 1, show(r));
r = await as(e2, "select name from storage.objects where bucket_id='resumes' and name=$1", [path3]);
check("a rival employer CANNOT read that resume", !r.error && r.rows.length === 0, show(r));
r = await as(e2, "select id from public.resumes where id=$1", [res3]);
check("a rival employer cannot see the resume record", !r.error && r.rows.length === 0, show(r));
r = await as(s1, "select id from public.resumes where id=$1", [res3]);
check("another student cannot see my resume record", !r.error && r.rows.length === 0, show(r));

// employer data isolation
r = await as(e2, "select id from public.applications");
check("rival employer sees ZERO applications", !r.error && r.rows.length === 0, show(r));
r = await as(e2, "select profile_id from public.student_profiles where profile_id=$1", [s1]);
check("rival employer cannot read applicant profiles", !r.error && r.rows.length === 0, show(r));
r = await as(e1, "select profile_id from public.student_profiles where profile_id=$1", [s1]);
check("my employer CAN read the profile of someone who applied to me", !r.error && r.rows.length === 1, show(r));
r = await as(e1, "select profile_id from public.student_profiles where profile_id=$1", [s2]);
check("...but NOT students who never applied", !r.error && r.rows.length === 0, show(r));
await as(e2, "update public.applications set status='rejected' where id=$1", [app1]);
check("rival employer cannot change my applicants' status", (await op("select status from public.applications where id=$1", [app1]))[0].status === "applied");
await as(s2, "update public.applications set status='withdrawn' where id=$1", [app1]);
check("another student cannot withdraw my application", (await op("select status from public.applications where id=$1", [app1]))[0].status === "applied");

// status workflow
r = await as(s1, "update public.applications set status='selected' where id=$1", [app1]);
check("student cannot award themselves 'selected'", !!r.error, show(r));
r = await as(e1, "update public.applications set status='shortlisted' where id=$1", [app1]);
check("employer shortlists a candidate", !r.error && (await op("select status from public.applications where id=$1", [app1]))[0].status === "shortlisted", show(r));
check("student is notified of the shortlist", (await op("select count(*)::int n from public.notifications where user_id=$1 and type='application_shortlisted'", [s1]))[0].n === 1);
r = await as(e1, "update public.applications set cover_note='edited by employer' where id=$1", [app1]);
check("application contents cannot be edited", !!r.error, show(r));
r = await as(e1, "update public.applications set status='applied' where id=$1", [app1]);
check("employer cannot move a candidate back to 'applied'", !!r.error, show(r));

// interviews
r = await as(e1, "insert into public.interviews (application_id, scheduled_by, scheduled_at, mode, meeting_link) values ($1,$2,now() - interval '1 day','video','https://meet.example.org/x')", [app1, e1]);
check("interview in the past is rejected", !!r.error, show(r));
r = await as(e1, "insert into public.interviews (application_id, scheduled_by, scheduled_at, mode) values ($1,$2,$3,'video')", [app1, e1, future()]);
check("video interview requires a meeting link", !!r.error, show(r));
r = await as(e2, "insert into public.interviews (application_id, scheduled_by, scheduled_at, mode, meeting_link) values ($1,$2,$3,'video','https://meet.example.org/x')", [app1, e2, future()]);
check("rival employer cannot schedule interviews for my applicant", !!r.error, show(r));
r = await as(s1, "insert into public.interviews (application_id, scheduled_by, scheduled_at, mode, meeting_link) values ($1,$2,$3,'video','https://meet.example.org/x')", [app1, s1, future()]);
check("student cannot schedule an interview", !!r.error, show(r));
r = await as(e1, "insert into public.interviews (application_id, scheduled_by, scheduled_at, mode, meeting_link) values ($1,$2,$3,'video','https://meet.example.org/room') returning id", [app1, e1, future()]);
check("employer schedules a valid interview", !r.error, show(r));
check("application moves to 'interview_scheduled' automatically", (await op("select status from public.applications where id=$1", [app1]))[0].status === "interview_scheduled");
r = await as(s1, "select id from public.interviews where application_id=$1", [app1]);
check("the student can see their interview", !r.error && r.rows.length === 1, show(r));
r = await as(s3, "select id from public.interviews", []);
check("another student cannot see it", !r.error && r.rows.length === 0, show(r));

// withdraw
r = await as(s1, "update public.applications set status='withdrawn' where id=$1", [app1]);
check("student can withdraw an active application", !r.error && (await op("select status from public.applications where id=$1", [app1]))[0].status === "withdrawn", show(r));
r = await as(e1, "update public.applications set status='shortlisted' where id=$1", [app1]);
check("employer cannot revive a withdrawn application", !!r.error, show(r));

// closed listing / deadline
await as(e1, "update public.jobs set status='closed' where id=$1", [job1]);
r = await as(s2, "insert into public.applications (job_id, student_id) values ($1,$2)", [job1, s2]);
check("cannot apply once a listing is closed", !!r.error, show(r));
r = await as(null, "select id from public.jobs where id=$1", [job1]);
check("closed listing disappears from public view", !r.error && r.rows.length === 0, show(r));
await op("update public.jobs set status='published', application_deadline = now() - interval '1 hour' where id=$1", [job1]);
r = await as(s2, "insert into public.applications (job_id, student_id) values ($1,$2)", [job1, s2]);
check("cannot apply after the deadline has passed", !!r.error, show(r));

// ---------------------------------------------------------------------------
console.log("\n== Saved jobs, notifications, reports");
const open1 = (await as(e1, JOB(c1, "status='published'"))).rows[0].id;
r = await as(s2, "insert into public.saved_jobs (student_id, job_id) values ($1,$2)", [s2, open1]);
check("student saves a job", !r.error, show(r));
r = await as(s2, "insert into public.saved_jobs (student_id, job_id) values ($1,$2)", [s3, open1]);
check("cannot save a job on someone else's behalf", !!r.error, show(r));
r = await as(s3, "select * from public.saved_jobs");
check("students cannot read each other's saved jobs", !r.error && r.rows.length === 0, show(r));
r = await as(s2, "insert into public.notifications (user_id, type, title) values ($1,'fake','You won')", [s2]);
check("users cannot forge notifications", !!r.error, show(r));
r = await as(s1, "select id from public.notifications where user_id=$1", [s2]);
check("users cannot read other people's notifications", !r.error && r.rows.length === 0, show(r));

r = await as(s2, "insert into public.reports (reporter_id, job_id, reason, details) values ($1,$2,'asks_for_money','They asked me to pay a registration fee before the interview.') returning id", [s2, open1]);
check("student reports a scam listing", !r.error, show(r));
const rep = r.rows?.[0]?.id;
r = await as(s2, "insert into public.reports (reporter_id, job_id, reason, details) values ($1,$2,'other','Trying to spam the same report twice over.')", [s2, open1]);
check("duplicate report on the same listing is blocked", !!r.error, show(r));
r = await as(null, "insert into public.reports (reporter_id, job_id, reason, details) values ($1,$2,'other','A logged-out visitor trying to file a report.')", [s2, open1]);
check("logged-out visitor cannot file reports", !!r.error, show(r));
r = await as(e1, "select id from public.reports");
check("the reported employer cannot read reports about them", !r.error && r.rows.length === 0, show(r));
r = await as(s2, "update public.reports set status='dismissed' where id=$1", [rep]);
check("reporter cannot dismiss their own report", (await op("select status from public.reports where id=$1", [rep]))[0].status === "open", show(r));
r = await as(adm, "update public.reports set status='resolved', resolution_note='Listing removed' where id=$1", [rep]);
check("admin resolves the report", !r.error && (await op("select status from public.reports where id=$1", [rep]))[0].status === "resolved", show(r));
r = await as(adm, "select count(*)::int n from public.applications");
check("admin can see platform data", !r.error && r.rows[0].n >= 2, show(r));
r = await as(adm, "update public.jobs set status='rejected', moderation_note='Misleading pay' where id=$1", [jobPending]);
check("admin can reject a listing", !r.error && (await op("select status from public.jobs where id=$1", [jobPending]))[0].status === "rejected", show(r));

// ---------------------------------------------------------------------------
console.log("\n== Google / GitHub sign-in: role choice (migration 007)");
const social1 = await newUser({ name: "Priya Google", iss: "https://accounts.google.com", email_verified: true });
const social2 = await newUser({ user_name: "octo-dev", provider_id: "123" });
const social3 = await newUser({ full_name: "Third Social" });
const prof = async (id) => (await op("select role, onboarded_at, full_name from public.profiles where id=$1", [id]))[0];
const subRows = async (id) => (await op("select (select count(*) from public.student_profiles where profile_id=$1)::int st, (select count(*) from public.employer_profiles where profile_id=$1)::int em", [id]))[0];
check("provider signup (no role) starts as student, NOT onboarded", (await prof(social1)).role === "student" && (await prof(social1)).onboarded_at === null);
check("provider name is used for full_name (name, then user_name)", (await prof(social1)).full_name === "Priya Google" && (await prof(social2)).full_name === "octo-dev");
check("provider signup creates no student/employer row yet", JSON.stringify(await subRows(social1)) === '{"st":0,"em":0}');
check("email signup with a role is marked onboarded", (await prof(s1)).onboarded_at !== null && (await prof(e1)).onboarded_at !== null);
check("signup with role=admin stays a non-onboarded student", (await prof(sneaky)).role === "student" && (await prof(sneaky)).onboarded_at === null);

r = await as(social1, "select public.complete_onboarding('employer') as r");
check("social user chooses Employer", !r.error && (await prof(social1)).role === "employer" && (await prof(social1)).onboarded_at !== null, show(r));
check("...and gets exactly one employer row and no student row", JSON.stringify(await subRows(social1)) === '{"st":0,"em":1}');
r = await as(social1, "select public.complete_onboarding('student') as r");
check("choosing again is refused (role cannot be switched back)", !!r.error && (await prof(social1)).role === "employer", show(r));
r = await as(social1, "select public.complete_onboarding('employer') as r");
check("repeating the same choice is refused and creates no duplicate rows", !!r.error && JSON.stringify(await subRows(social1)) === '{"st":0,"em":1}' && (await op("select count(*)::int n from public.profiles where id=$1", [social1]))[0].n === 1, show(r));

r = await as(social2, "select public.complete_onboarding('student') as r");
check("social user chooses Student", !r.error && (await prof(social2)).role === "student" && JSON.stringify(await subRows(social2)) === '{"st":1,"em":0}', show(r));

r = await as(social3, "select public.complete_onboarding('admin') as r");
check("onboarding refuses 'admin'", !!r.error && (await prof(social3)).role === "student" && (await prof(social3)).onboarded_at === null, show(r));
r = await as(social3, "select public.complete_onboarding('superuser') as r");
check("onboarding refuses unknown roles", !!r.error, show(r));
r = await as(social3, "update public.profiles set role='admin', onboarded_at=now() where id=$1", [social3]);
check("direct update cannot self-promote to admin during onboarding", !!r.error && (await prof(social3)).role === "student", show(r));
r = await as(null, "select public.complete_onboarding('student') as r");
check("logged-out visitor cannot call onboarding", !!r.error, show(r));

r = await as(s1, "update public.profiles set onboarded_at=null where id=$1", [s1]);
check("an onboarded user cannot reset onboarded_at to re-open the choice", !!r.error && (await prof(s1)).onboarded_at !== null, show(r));
r = await as(s1, "update public.profiles set role='employer' where id=$1", [s1]);
check("an onboarded student cannot switch to employer", !!r.error && (await prof(s1)).role === "student", show(r));
r = await as(s1, "select public.complete_onboarding('employer') as r");
check("an onboarded student cannot use onboarding to switch role", !!r.error && (await prof(s1)).role === "student", show(r));
r = await as(e1, "select public.complete_onboarding('student') as r");
check("an onboarded employer cannot use onboarding to become a student", !!r.error && (await prof(e1)).role === "employer", show(r));

const admPending = await newUser({ name: "Admin Pending" });
await op("update public.profiles set role='admin' where id=$1", [admPending]); // operator-only path, onboarded_at left NULL
r = await as(admPending, "select public.complete_onboarding('student') as r");
check("an admin cannot be demoted/changed through onboarding", !!r.error && (await prof(admPending)).role === "admin", show(r));
const susp = await newUser({ name: "Suspended Social" });
await op("update public.profiles set is_suspended=true where id=$1", [susp]);
r = await as(susp, "select public.complete_onboarding('student') as r");
check("a suspended user cannot complete onboarding", !!r.error && (await prof(susp)).onboarded_at === null, show(r));

// Back-fill: a database that already has users when migration 007 arrives.
{
  const old = new PGlite();
  await old.exec(SHIM);
  const files = fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort();
  for (const f of files.filter((x) => !x.includes("000007"))) await old.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  const oldId = randomUUID();
  await old.query("insert into auth.users (id, email, raw_user_meta_data) values ($1,'old@t.test',$2)", [oldId, JSON.stringify({ role: "employer", full_name: "Old Employer" })]);
  await old.exec(fs.readFileSync(path.join(dir, files.find((x) => x.includes("000007"))), "utf8"));
  const row = (await old.query("select role, onboarded_at, created_at from public.profiles where id=$1", [oldId])).rows[0];
  check("existing users are back-filled as already onboarded; roles untouched", row.role === "employer" && row.onboarded_at && String(row.onboarded_at) === String(row.created_at), JSON.stringify(row));
}

// ---------------------------------------------------------------------------
check("test file itself has no SQL mistakes", harnessErrors.length === 0, harnessErrors.join(" | "));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
