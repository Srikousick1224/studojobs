/**
 * LOCAL DEV/TEST ONLY. (Re)creates a throw-away Postgres database from the real migrations.
 *
 *   DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:54329/postgres node scripts/dev/local-db.mjs [--seed] [--proposed]
 *
 * --proposed also applies supabase/proposed/*.sql (not-yet-approved migrations).
 * --seed     also applies supabase/seed/demo_listings.sql (fictional demo data).
 * --with-009 applies migration 009 (job moderation hardening) AFTER the seed and test accounts, because 009 stops the
 *            database operator from publishing a listing directly (the seed does that). Used to test the admin approve flow.
 * It also creates four test accounts (see TEST_USERS) so browser tests can sign in. Never point this at a real project.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const adminUrl = process.env.DATABASE_ADMIN_URL ?? "postgres://postgres@127.0.0.1:54329/postgres";
const dbName = process.env.LOCAL_DB_NAME ?? "studojob_local";
const withProposed = process.argv.includes("--proposed");
const withSeed = process.argv.includes("--seed");
const with009 = process.argv.includes("--with-009");

export const TEST_USERS = [
  { email: "student@test.local", name: "Asha Verma", role: "student" },
  { email: "student2@test.local", name: "Bala Kumar", role: "student" },
  { email: "employer@test.local", name: "Esha Rao", role: "employer" },
  { email: "admin@test.local", name: "Op Admin", role: "student" }, // promoted below, locally only
];

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
await admin.query(`drop database if exists ${dbName} with (force)`);
await admin.query(`create database ${dbName}`);
await admin.end();

const url = new URL(adminUrl);
url.pathname = "/" + dbName;
const db = new pg.Client({ connectionString: url.toString() });
await db.connect();
const run = async (file) => db.query(fs.readFileSync(file, "utf8"));
await run(path.join(root, "scripts/dev/supabase-shim.sql"));
for (const f of fs.readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql")).sort()) await run(path.join(root, "supabase/migrations", f));
if (withProposed) {
  for (const f of fs.readdirSync(path.join(root, "supabase/proposed")).filter((x) => x.endsWith(".sql") && !x.startsWith("ROLLBACK") && !x.startsWith("20261105")).sort()) await run(path.join(root, "supabase/proposed", f));
}
if (withSeed) await run(path.join(root, "supabase/seed/demo_listings.sql"));
for (const u of TEST_USERS) {
  await db.query("insert into auth.users (email, raw_user_meta_data) values ($1, $2)", [u.email, JSON.stringify({ role: u.role, full_name: u.name })]);
}
await db.query("update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'admin@test.local')");
const { rows } = await db.query("select email, id, (select role from public.profiles p where p.id = u.id) as role, (select onboarded_at is not null from public.profiles p where p.id = u.id) as onboarded from auth.users u order by email");
if (with009) {
  const f = fs.readdirSync(path.join(root, "supabase/proposed")).find((x) => /^20261105000009_.*\.sql$/.test(x));
  await run(path.join(root, "supabase/proposed", f));
}
console.log(`database ${dbName} ready (proposed=${withProposed}, seed=${withSeed}, migration009=${with009})`);
console.table(rows);
await db.end();
