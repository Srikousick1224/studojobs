/**
 * User settings (proposed migration 012) security test. Local PGlite only, never a real project.
 * Run: npm run test:settings-db (also covers migration 013, the employer auto-reply)
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
  } catch (e) { await db.exec("rollback"); return { error: String(e.message ?? e) }; }
}
const op = async (sql, p = []) => (await db.query(sql, p)).rows;
const user = async (meta) => { const id = randomUUID(); await db.query("insert into auth.users (id,email,raw_user_meta_data) values ($1,$2,$3)", [id, id + "@t.test", JSON.stringify(meta)]); return id; };

await db.exec(SHIM);
for (const d of ["migrations", "proposed"])
  for (const f of fs.readdirSync(path.join(base, d)).filter((x) => x.endsWith(".sql") && !x.startsWith("ROLLBACK") && !x.startsWith("20261105")).sort())  // 20261105* = migration 009, tested on its own in migration-009.test.mjs
    await db.exec(fs.readFileSync(path.join(base, d, f), "utf8"));

const a = await user({ account_type: "student", full_name: "Asha" });
const b = await user({ account_type: "employer", full_name: "Bala" });
check("table exists with RLS on", (await op("select rowsecurity from pg_tables where schemaname='public' and tablename='user_settings'"))[0]?.rowsecurity === true);
check("user can create own row", !(await as(a, "insert into public.user_settings (user_id, data) values ($1, '{\"digest\":\"weekly\"}')", [a])).error);
check("user can read own row", (await as(a, "select data from public.user_settings")).rows?.[0]?.data?.digest === "weekly");
check("user can update own row", (await as(a, "update public.user_settings set data = '{\"digest\":\"daily\"}' where user_id = $1 returning 1", [a])).rows?.length === 1);
check("updated_at moves on update", (await op("select updated_at > now() - interval '1 minute' as ok from public.user_settings"))[0].ok);
check("another user cannot read it", (await as(b, "select * from public.user_settings")).rows?.length === 0);
check("another user cannot update it", (await as(b, "update public.user_settings set data = '{}' where user_id = $1 returning 1", [a])).rows?.length === 0);
check("cannot insert a row for someone else", !!(await as(b, "insert into public.user_settings (user_id, data) values ($1, '{}')", [a])).error);
check("anonymous visitor has no access", !!(await as(null, "select * from public.user_settings")).error);
check("users cannot delete rows", (await as(a, "delete from public.user_settings returning 1")).rows?.length === 0);
check("data must be a JSON object", !!(await as(b, "insert into public.user_settings (user_id, data) values ($1, '[1]')", [b])).error);
check("data size is capped", !!(await as(b, "insert into public.user_settings (user_id, data) values ($1, jsonb_build_object('x', repeat('a', 9000)))", [b])).error);
await op("delete from public.profiles where id = $1", [a]);
check("row is removed with the account", (await op("select count(*)::int n from public.user_settings"))[0].n === 0);


// ---- migration 013: employer auto-reply ------------------------------------------------------------
const owner = await user({ account_type: "employer", full_name: "Owner" });
const stu = await user({ account_type: "student", full_name: "Stu" });
const [{ id: co }] = await op("insert into public.companies (owner_id, name, slug, verification_status) values ($1, 'Reply Co', '', 'approved') returning id", [owner]);
const [{ id: job }] = await op(`insert into public.jobs (company_id, title, summary, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, pay_period, status, published_at, created_by)
  values ($1, 'Intern', 'Real work with the team for a semester.', 'internship', 'remote', 'full_time', 'internship', 'Remote', true, 10000, 12000, 'month', 'published', now(), $2) returning id`, [co, owner]);
const notes = async (uid) => (await op("select type, title, body from public.notifications where user_id=$1 order by created_at", [uid]));

let r = await as(stu, "insert into public.applications (job_id, student_id) values ($1,$2)", [job, stu]);
check("apply works with auto-reply OFF", !r.error, r.error);
check("auto-reply OFF: student gets no employer message", !(await notes(stu)).some((n) => n.type === "employer_message"));
await op("delete from public.applications");
await op("delete from public.notifications");

await op("insert into public.user_settings (user_id, data) values ($1, $2)", [owner, JSON.stringify({ prefs: { autoReply: true, autoReplyText: "Thanks!\u0007 We will reply soon." } })]);
r = await as(stu, "insert into public.applications (job_id, student_id) values ($1,$2)", [job, stu]);
const n1 = (await notes(stu)).find((n) => n.type === "employer_message");
check("auto-reply ON: student receives the message", n1?.title === "Message from Reply Co" && n1.body.startsWith("Thanks!"), JSON.stringify(n1));
check("control characters are stripped", n1 && !/[\u0000-\u001f]/.test(n1.body));
check("employer still gets the normal 'New application' notification", (await notes(owner)).some((n) => n.type === "application_received"));
await op("delete from public.applications"); await op("delete from public.notifications");

await op("update public.user_settings set data = $2 where user_id = $1", [owner, JSON.stringify({ prefs: { autoReply: true, autoReplyText: "   " } })]);
r = await as(stu, "insert into public.applications (job_id, student_id) values ($1,$2)", [job, stu]);
check("blank auto-reply text sends nothing", !(await notes(stu)).some((n) => n.type === "employer_message"));
await op("delete from public.applications"); await op("delete from public.notifications");

await op("update public.user_settings set data = $2 where user_id = $1", [owner, JSON.stringify({ prefs: { autoReply: "banana", autoReplyText: "x" } })]);
r = await as(stu, "insert into public.applications (job_id, student_id) values ($1,$2)", [job, stu]);
check("garbage settings never block an application", !r.error, r.error);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
