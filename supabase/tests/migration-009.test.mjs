/**
 * Migration 009 (job moderation hardening v5) apply / behave / roll back test.
 * LOCAL PGlite ONLY (Postgres compiled to WebAssembly). It never touches a real Supabase project.
 * What it proves: the SQL applies after 001-007, the main rules work, the rollback restores the old functions
 * exactly, 009 can be applied again, and community/settings migrations 010-013 still apply on top.
 * What it does NOT prove: real concurrency (one connection), PostgREST/JWT behaviour, the Supabase server itself.
 * Run: npm run test:migration-009
 */
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
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
let passed = 0, failed = 0;
const check = (n, c, d = "") => { if (c) passed++; else failed++; console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && d ? "  -> " + d : ""}`); };
async function as(uid, sql, params = []) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ""]);
    const r = await db.query(sql, params);
    await db.exec("commit");
    return { rows: r.rows };
  } catch (e) { await db.exec("rollback"); return { error: String(e.message ?? e), code: e.code }; }
}
const op = async (sql, p = []) => (await db.query(sql, p)).rows;
const user = async (meta) => { const id = randomUUID(); await db.query("insert into auth.users (id,email,raw_user_meta_data) values ($1,$2,$3)", [id, id + "@t.test", JSON.stringify(meta)]); return id; };
const sqlOf = (dir, f) => fs.readFileSync(path.join(base, dir, f), "utf8");
const files = (dir, re) => fs.readdirSync(path.join(base, dir)).filter((f) => re.test(f)).sort();

await db.exec(SHIM);
for (const f of files("migrations", /\.sql$/)) await db.exec(sqlOf("migrations", f));

const guardBefore = (await op("select md5(pg_get_functiondef('private.jobs_guard'::regproc)) h"))[0].h;
const companiesGuardBefore = (await op("select md5(pg_get_functiondef('private.companies_guard'::regproc)) h"))[0].h;

// People and data (created before 009, like real listings would be)
const admin = await user({ role: "student", full_name: "Admin" });
await op("update public.profiles set role = 'admin' where id = $1", [admin]);
const owner = await user({ role: "employer", full_name: "Owner" });
const owner2 = await user({ role: "employer", full_name: "Owner Two" });
const [{ id: coV }] = await op("insert into public.companies (owner_id, name, slug, verification_status) values ($1, 'Verified Co', '', 'approved') returning id", [owner]);
const [{ id: coU }] = await op("insert into public.companies (owner_id, name, slug, verification_status) values ($1, 'Unverified Co', '', 'pending') returning id", [owner2]);
const newJob = (company, uid, status = "draft", title = "Intern") => as(uid, `insert into public.jobs (company_id, title, summary, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, pay_period, status, created_by)
  values ($1, $2, 'Real work with the team for a semester.', 'internship', 'remote', 'full_time', 'internship', 'Remote', true, 10000, 12000, 'month', $3, $4) returning id, status, content_version`, [company, title, status, uid]);

const legacy = (await op(`insert into public.jobs (company_id, title, summary, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, pay_period, status, published_at, created_by)
  values ($1, 'Legacy live', 'Live before migration 009 existed.', 'internship', 'remote', 'full_time', 'internship', 'Remote', true, 1, 2, 'month', 'published', now(), $2) returning id`, [coV, owner]))[0].id;

// ---- apply 009 ------------------------------------------------------------------------------------
const m009 = files("proposed", /^20261105000009_.*\.sql$/)[0];
const rb009 = files("proposed", /^ROLLBACK_20261105000009_.*\.sql$/)[0];
check("009 and its rollback files exist", !!m009 && !!rb009);
let applyError = null;
try { await db.exec(sqlOf("proposed", m009)); } catch (e) { applyError = e.message; }
check("009 applies cleanly after migrations 001-007", !applyError, applyError ?? "");
check("approve_job() exists and jobs.content_version exists", (await op("select count(*)::int n from pg_proc where proname='approve_job'"))[0].n === 1 && (await op("select count(*)::int n from information_schema.columns where table_name='jobs' and column_name='content_version'"))[0].n === 1);
check("clients cannot read private.job_approvals", !!(await as(owner, "select * from private.job_approvals")).error);
check("a listing that was live before 009 stays live", (await op("select status from public.jobs where id=$1", [legacy]))[0].status === "published");

// ---- behaviour ------------------------------------------------------------------------------------
let r = await newJob(coV, owner, "draft");
const jV = r.rows?.[0]?.id;
check("employer can create a draft", !!jV, r.error);
r = await as(owner, "update public.jobs set status='published' where id=$1 returning status", [jV]);
check("verified company: first publish goes live without the queue", r.rows?.[0]?.status === "published", r.error);

r = await as(owner, "update public.jobs set title='Totally different title' where id=$1 returning status, content_version", [jV]);
check("editing a live listing sends it back to review and bumps the version", r.rows?.[0]?.status === "pending_review" && r.rows?.[0]?.content_version === 2, JSON.stringify(r));

r = await as(owner, "update public.jobs set status='published' where id=$1 returning status", [jV]);
check("employer cannot republish edited content by themselves", r.rows?.[0]?.status === "pending_review", JSON.stringify(r));

r = await as(admin, "update public.jobs set status='published' where id=$1", [jV]);
check("admin direct publish is refused (must use approve_job)", /approve_job/.test(r.error ?? ""), JSON.stringify(r));

r = await as(admin, "select (approve_job($1, 1)).id", [jV]);
check("approve_job with an old version is refused (40001)", r.code === "40001", JSON.stringify(r));
r = await as(owner, "select (approve_job($1, 2)).id", [jV]);
check("an employer cannot call approve_job", /Only a moderator/.test(r.error ?? ""), JSON.stringify(r));
r = await as(null, "select (approve_job($1, 2)).id", [jV]);
check("a visitor cannot call approve_job", !!r.error, JSON.stringify(r));
r = await as(admin, "select (approve_job($1, 2)).status", [jV]);
check("approve_job with the current version publishes", r.rows?.[0]?.status === "published", JSON.stringify(r));

r = await newJob(coU, owner2, "draft");
const jU = r.rows?.[0]?.id;
r = await as(owner2, "update public.jobs set status='published' where id=$1 returning status", [jU]);
check("unverified company: publish goes to the moderation queue", r.rows?.[0]?.status === "pending_review", JSON.stringify(r));

// the app's own query (moderation page) must still be able to read the version
r = await as(admin, "select id, content_version from public.jobs where status='pending_review'");
check("admin queue can read content_version", (r.rows ?? []).every((x) => Number.isInteger(x.content_version)) && (r.rows ?? []).length >= 1, JSON.stringify(r));

r = await as(owner2, "insert into public.skills (name) values ('Brand new skill')");
check("employer can no longer create catalogue skills", !!r.error);
r = await as(admin, "insert into public.skills (name) values ('Admin made skill') returning id");
check("admin can create catalogue skills", !!r.rows?.length, JSON.stringify(r));

// ---- rollback -------------------------------------------------------------------------------------
let rbError = null;
try { await db.exec(sqlOf("proposed", rb009)); } catch (e) { rbError = e.message; }
check("rollback runs cleanly", !rbError, rbError ?? "");
check("rollback restores jobs_guard() exactly", (await op("select md5(pg_get_functiondef('private.jobs_guard'::regproc)) h"))[0].h === guardBefore);
check("rollback restores companies_guard() exactly", (await op("select md5(pg_get_functiondef('private.companies_guard'::regproc)) h"))[0].h === companiesGuardBefore);
check("rollback removes approve_job, content_version and private tables", (await op("select (select count(*) from pg_proc where proname='approve_job') + (select count(*) from information_schema.columns where table_name='jobs' and column_name='content_version') + (select count(*) from information_schema.tables where table_schema='private' and table_name in ('job_approvals','company_rejections')) as n"))[0].n === 0);
check("rollback keeps every listing", (await op("select count(*)::int n from public.jobs"))[0].n === 3);
r = await as(admin, "update public.jobs set status='published' where id=$1 returning status", [jU]);
check("after rollback an admin can publish directly again (old behaviour)", r.rows?.[0]?.status === "published", JSON.stringify(r));

// ---- apply again, then the later migrations -------------------------------------------------------
let again = null;
try { await db.exec(sqlOf("proposed", m009)); } catch (e) { again = e.message; }
check("009 can be applied again after a rollback", !again, again ?? "");
let later = null;
try { for (const f of files("proposed", /^2026111\d.*\.sql$/).filter((f) => !f.startsWith("ROLLBACK"))) await db.exec(sqlOf("proposed", f)); } catch (e) { later = e.message; }
check("migrations 010-013 apply on top of 009", !later, later ?? "");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
