// LOCAL DEV/TEST ONLY: automatic accessibility scan (axe-core, WCAG 2.0/2.1 A + AA) of public, student, employer and admin pages,
// in light and dark mode, at desktop and phone width. Automatic tools find roughly a third of real problems: this does NOT replace
// a keyboard-only pass and a screen-reader pass by a human.
//   node scripts/dev/e2e/a11y.mjs            # fail on serious/critical issues
//   A11Y_ALL=1 node scripts/dev/e2e/a11y.mjs # also list moderate/minor
import fs from "node:fs";
import { createRequire } from "node:module";
import pg from "pg";
import { BASE, context, launch, tracker } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const t = tracker();
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/studojob_local" });
await db.connect();
const one = async (sql) => (await db.query(sql)).rows[0];
const job = (await one("select id from jobs where status='published' order by created_at limit 1")).id;
const company = (await one("select slug from companies where verification_status='approved' order by created_at limit 1")).slug;
const post = (await one("select id from community_posts order by created_at limit 1").catch(() => null))?.id;
const ownJob = (await one("select j.id from jobs j join companies c on c.id=j.company_id join auth.users u on u.id=c.owner_id where u.email='employer@test.local' limit 1").catch(() => null))?.id;
await db.end();

const PAGES = {
  public: ["/", "/jobs", `/jobs/${job}`, "/internships", "/companies", `/companies/${company}`, "/community", ...(post ? [`/community/${post}`] : []), "/resources", "/about", "/contact", "/help", "/safety", "/privacy", "/terms", "/login", "/register", "/forgot-password", `/report?job=${job}`, `/report?company=${company}`],
  student: ["/student", "/student/profile", "/student/applications", "/student/saved", "/student/notifications", "/student/settings"],
  employer: ["/employer", "/employer/company", "/employer/jobs", "/employer/jobs/new", ...(ownJob ? [`/employer/jobs/${ownJob}/edit`] : []), "/employer/applicants", "/employer/notifications", "/employer/settings"],
  admin: ["/admin", "/admin/moderation"],
};
const WHO = { public: null, student: "student@test.local", employer: "employer@test.local", admin: "admin@test.local" };
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const ALL = process.env.A11Y_ALL === "1";
const browser = await launch();
const summary = new Map(); // rule id -> {impact, help, count, pages:Set}

async function scan(page, path, label) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  await page.waitForTimeout(1600); // let reveal animations settle so contrast is measured on final colours
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async (tags) => await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] }), TAGS);
  const bad = res.violations.filter((v) => ALL || v.impact === "serious" || v.impact === "critical");
  t.check(`${label} ${path}`, bad.length === 0, bad.map((v) => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" ; ")}`).join(" | "));
  for (const v of res.violations) {
    const s = summary.get(v.id) ?? { impact: v.impact, help: v.help, count: 0, pages: new Set() };
    s.count += v.nodes.length; s.pages.add(`${label}${path}`); summary.set(v.id, s);
  }
}

try {
  for (const mode of [{ name: "light", colorScheme: "light", viewport: { width: 1280, height: 900 } }, { name: "dark", colorScheme: "dark", viewport: { width: 1280, height: 900 } }, { name: "phone", colorScheme: "light", viewport: { width: 390, height: 844 } }]) {
    for (const [group, paths] of Object.entries(PAGES)) {
      if (mode.name !== "light" && group === "admin") continue; // admin screens are used by one person on a desktop
      const ctx = await context(browser, WHO[group], { colorScheme: mode.colorScheme, viewport: mode.viewport });
      const page = await ctx.newPage();
      for (const p of paths) await scan(page, p, `[${mode.name}]`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
console.log("\nAll rules that fired (any impact):");
for (const [id, s] of [...summary.entries()].sort((a, b) => b[1].count - a[1].count)) console.log(`  ${s.impact.padEnd(8)} ${id}  x${s.count} on ${s.pages.size} page(s) — ${s.help}`);
process.exit(t.done() ? 0 : 1);
