/**
 * LOCAL DEV/TEST ONLY. Prints a signed session (JSON) for a local test user, or the cookie value the app expects.
 *   node scripts/dev/mint-session.mjs student@test.local            -> session JSON
 *   node scripts/dev/mint-session.mjs student@test.local --cookie   -> value for the sb-<host>-auth-token cookie
 */
import pg from "pg";
import { sessionFor } from "./local-supabase.mjs";

export async function mint(email, databaseUrl = process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/studojob_local") {
  const c = new pg.Client({ connectionString: databaseUrl });
  await c.connect();
  try {
    const { rows } = await c.query("select * from auth.users where email = $1", [email]);
    if (!rows[0]) throw new Error(`no local user ${email}`);
    return sessionFor(rows[0]);
  } finally { await c.end(); }
}
export const cookieValue = (session) => "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");

if (import.meta.url === `file://${process.argv[1]}`) {
  const s = await mint(process.argv[2]);
  console.log(process.argv.includes("--cookie") ? cookieValue(s) : JSON.stringify(s));
}
