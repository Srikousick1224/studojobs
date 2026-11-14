/**
 * Community (proposed migration 010) security test. Local PGlite only, never a real project.
 * Run: npm run test:community-db
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
  for (const f of fs.readdirSync(path.join(base, d)).filter((x) => x.endsWith(".sql") && !x.startsWith("ROLLBACK")).sort())
    await db.exec(fs.readFileSync(path.join(base, d, f), "utf8"));
check("community tables exist with RLS on", (await op("select count(*)::int n from pg_tables where schemaname='public' and tablename like 'community_%' and rowsecurity"))[0].n === 5);

const a = await user({ role: "student", full_name: "Asha Verma" });
const b = await user({ role: "student", full_name: "Bala K" });
const admin = await user({ full_name: "Op" });
await op("update public.profiles set role='admin' where id=$1", [admin]);
const susp = await user({ full_name: "Banned" });
await op("update public.profiles set is_suspended=true where id=$1", [susp]);

let r = await as(a, "insert into public.community_posts (author_id, author_name, author_role, kind, title, body) values ($1,'Fake Admin','admin','tip','Resume tip one','Keep your resume to one page.') returning id, author_name, author_role, status", [b]);
check("post is stamped with the real author and name, not forged values", !r.error && r.rows[0].author_name === "Asha Verma" && r.rows[0].author_role === "student", JSON.stringify(r));
const p1 = r.rows[0].id;
check("author_id cannot be forged to another user", (await op("select author_id from public.community_posts where id=$1", [p1]))[0].author_id === a);
r = await as(null, "insert into public.community_posts (author_id,title,body) values ($1,'Anon post here','Anonymous body text.')", [a]);
check("logged-out visitor cannot post", !!r.error);
r = await as(susp, "insert into public.community_posts (title,body,author_id) values ('Suspended post','Suspended body text.',$1)", [susp]);
check("suspended user cannot post", !!r.error);
r = await as(a, "insert into public.community_posts (author_id,title,body) values ($1,'abc','too short')", [a]);
check("too-short title rejected", !!r.error);
r = await as(null, "select id, author_name from public.community_posts");
check("logged-out visitor can read published posts", !r.error && r.rows.length === 1 && r.rows[0].author_name === "Asha Verma", JSON.stringify(r));
r = await as(null, "select * from public.profiles");
check("...but still cannot read profiles", !!r.error);

r = await as(b, "update public.community_posts set title='Hijacked title' where id=$1 returning id", [p1]);
check("another user cannot edit my post", !r.error && r.rows.length === 0);
r = await as(a, "update public.community_posts set title='Edited title ok', status='hidden', author_name='Hacker' where id=$1 returning title,status,author_name", [p1]);
check("author edit changes wording but cannot self-unhide/rename/status", !r.error && r.rows[0].title === "Edited title ok" && r.rows[0].status === "published" && r.rows[0].author_name === "Asha Verma", JSON.stringify(r));

r = await as(b, "insert into public.community_likes (post_id,user_id) values ($1,$2)", [p1, b]);
check("user can like a post", !r.error);
r = await as(b, "insert into public.community_likes (post_id,user_id) values ($1,$2)", [p1, b]);
check("duplicate like blocked", !!r.error);
r = await as(b, "insert into public.community_likes (post_id,user_id) values ($1,$2)", [p1, a]);
check("cannot like on behalf of someone else", !!r.error);
r = await as(b, "delete from public.community_likes where post_id=$1 and user_id=$2 returning 1", [p1, b]);
check("user can unlike", !r.error && r.rows.length === 1);

r = await as(b, "insert into public.community_comments (post_id,author_id,body,author_name) values ($1,$2,'Great tip, thanks!','Fake')", [p1, b]);
check("user can comment (name stamped by server)", !r.error);
check("comment name is the real one", (await op("select author_name from public.community_comments"))[0].author_name === "Bala K");
r = await as(null, "insert into public.community_comments (post_id,author_id,body) values ($1,$2,'anon')", [p1, a]);
check("logged-out visitor cannot comment", !!r.error);
r = await as(null, "select body from public.community_comments");
check("visitor can read comments on published posts", !r.error && r.rows.length === 1);

r = await as(b, "update public.community_posts set status='hidden' where id=$1 returning id", [p1]);
check("non-admin cannot hide posts", !r.error && r.rows.length === 0);
r = await as(admin, "update public.community_posts set status='hidden' where id=$1 returning status", [p1]);
check("admin can hide a post", !r.error && r.rows[0].status === "hidden");
r = await as(null, "select id from public.community_posts");
check("hidden post disappears for visitors", !r.error && r.rows.length === 0);
r = await as(null, "select id from public.community_comments");
check("comments of hidden posts disappear too", !r.error && r.rows.length === 0);
r = await as(b, "insert into public.community_comments (post_id,author_id,body) values ($1,$2,'late comment')", [p1, b]);
check("cannot comment on a hidden post", !!r.error);
r = await as(a, "select id from public.community_posts");
check("author still sees own hidden post", !r.error && r.rows.length === 1);

for (let i = 0; i < 5; i++) await as(b, "insert into public.community_posts (author_id,title,body) values ($1,'Daily limit post','Body of the limit test post.')", [b]);
r = await as(b, "insert into public.community_posts (author_id,title,body) values ($1,'Sixth post today','Body of the limit test post.')", [b]);
check("daily post limit (5) enforced", !!r.error && /limit/i.test(r.error), JSON.stringify(r));

r = await as(a, "delete from public.community_posts where id=$1 returning 1", [p1]);
check("author can delete own post (cascades)", !r.error && r.rows.length === 1 && (await op("select count(*)::int n from public.community_comments"))[0].n === 0);

// ---- migration 011: bookmarks + reports
const c = await user({ role: "student", full_name: "Chitra" });
const d = await user({ role: "student", full_name: "Dev" });
const e = await user({ role: "employer", full_name: "Esha" });
const pr = await as(c, "insert into public.community_posts (author_id,title,body) values ($1,'Report target','A post that will be reported.') returning id", [c]);
const p2 = pr.rows[0].id;
r = await as(d, "insert into public.community_bookmarks (post_id,user_id) values ($1,$2)", [p2, d]);
check("user can save a post", !r.error);
r = await as(c, "select * from public.community_bookmarks");
check("bookmarks are private to their owner", !r.error && r.rows.length === 0);
r = await as(null, "select * from public.community_bookmarks");
check("visitors cannot read bookmarks", !!r.error);
r = await as(c, "insert into public.community_reports (post_id,reporter_id,reason) values ($1,$2,'spam')", [p2, c]);
check("cannot report your own post", !!r.error);
r = await as(d, "insert into public.community_reports (post_id,reporter_id,reason,details) values ($1,$2,'scam','Asks for money')", [p2, d]);
check("user can report a post", !r.error);
r = await as(d, "insert into public.community_reports (post_id,reporter_id,reason) values ($1,$2,'spam')", [p2, d]);
check("same person cannot report twice", !!r.error);
r = await as(c, "select * from public.community_reports");
check("post author cannot read reports about them", !r.error && r.rows.length === 0);
r = await as(null, "insert into public.community_reports (post_id,reporter_id,reason) values ($1,$2,'spam')", [p2, d]);
check("visitors cannot report", !!r.error);
check("1 report does not hide the post", (await op("select status from public.community_posts where id=$1", [p2]))[0].status === "published");
await as(e, "insert into public.community_reports (post_id,reporter_id,reason) values ($1,$2,'abusive')", [p2, e]);
await as(b, "insert into public.community_reports (post_id,reporter_id,reason) values ($1,$2,'spam')", [p2, b]);
check("3 different reporters auto-hide the post", (await op("select status from public.community_posts where id=$1", [p2]))[0].status === "hidden");
r = await as(c, "update public.community_posts set status='published' where id=$1 returning status", [p2]);
check("author cannot un-hide a reported post", !r.error && (r.rows.length === 0 || r.rows[0].status === "hidden"), JSON.stringify(r));
r = await as(admin, "select count(*)::int n from public.community_reports");
check("admin can read reports", !r.error && r.rows[0].n === 3);
r = await as(admin, "update public.community_posts set status='published' where id=$1 returning status", [p2]);
check("admin can restore the post", !r.error && r.rows[0].status === "published");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
