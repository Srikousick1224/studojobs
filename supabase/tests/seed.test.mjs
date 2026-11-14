/**
 * Demo seed test. Local PGlite only, never a real project.
 * Run: npm run test:seed
 */
import { PGlite } from "@electric-sql/pglite";
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
  } catch (e) { await db.exec("rollback"); return { error: String(e.message ?? e) }; }
}
const op = async (sql, p = []) => (await db.query(sql, p)).rows;

await db.exec(SHIM);
await db.exec("alter table auth.users add column aud text, add column role text, add column created_at timestamptz, add column updated_at timestamptz"); // real Supabase has these
for (const f of fs.readdirSync(path.join(base, "migrations")).filter((x) => x.endsWith(".sql")).sort()) await db.exec(fs.readFileSync(path.join(base, "migrations", f), "utf8"));
const seed = fs.readFileSync(path.join(base, "seed", "demo_listings.sql"), "utf8");
await db.exec(seed);
const n = async (t) => (await op(`select count(*)::int n from ${t}`))[0].n;
check("14 demo companies, all approved", (await n("public.companies where verification_status='approved' and slug like 'demo-%'")) === 14);
check("54 listings published", (await n("public.jobs where status='published'")) === 54);
check("internships, jobs and freelance all present", (await op("select count(distinct type)::int n from public.jobs"))[0].n === 3);
check("unpaid roles disclosed (pay disclosure rule holds)", (await n("public.jobs where not is_paid")) === 2);
check("at least 20 jobs and 20 internships", (await n("public.jobs where type='job'")) >= 20 && (await n("public.jobs where type='internship'")) >= 20);
check("every listing has skills", (await n("public.jobs j where not exists (select 1 from public.job_skills s where s.job_id=j.id)")) === 0);
const r = await as(null, "select count(*)::int n from public.jobs");
check("logged-out visitor can see all 54", !r.error && r.rows[0].n === 54, JSON.stringify(r));
await db.exec(seed);
check("re-running the seed does not duplicate", (await n("public.jobs")) === 54);
await db.exec(fs.readFileSync(path.join(base, "seed", "demo_listings_cleanup.sql"), "utf8"));
check("cleanup removes jobs, companies and demo users", (await n("public.jobs")) + (await n("public.companies")) + (await n("auth.users")) === 0);
check("cleanup leaves reference data", (await n("public.job_categories")) > 0);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
