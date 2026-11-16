// LOCAL DEV/TEST ONLY: browser checks for the Settings pages, new dashboards and the landing-page motion.
import pg from "pg";
import { BASE, context, launch, tracker, watch } from "./helpers.mjs";
const t = tracker();
const SHOTS = process.env.SHOTS ?? "/tmp/claude-0/shots";
import fs from "node:fs"; fs.mkdirSync(SHOTS, { recursive: true });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/studojob_local" });
await db.connect();
await db.query("delete from user_settings where user_id in (select id from auth.users where email in ('student@test.local','employer@test.local'))");
const uid = async (email) => (await db.query("select id from auth.users where email=$1", [email])).rows[0].id;
await db.query("delete from companies where slug='settings-e2e-co'");
await db.query("insert into companies (owner_id, name, slug) values ($1, 'Settings E2E Co', 'settings-e2e-co') on conflict do nothing", [await uid("employer@test.local")]);
const browser = await launch();
try {
  // ---- landing page motion
  let ctx = await context(browser); let page = await ctx.newPage(); let errs = watch(page);
  await page.goto(BASE); await page.waitForTimeout(1600);
  await page.screenshot({ path: `${SHOTS}/landing-hero.png` });
  t.check("landing: hero pieces animated in", (await page.locator(".hero-in").count()) >= 5);
  await page.locator("#how-title").scrollIntoViewIfNeeded(); await page.waitForTimeout(900);
  const story = page.locator(".story");
  t.check("landing: scroll story is pinned scene", (await story.count()) === 1);
  const box = await story.boundingBox();
  const top = (await page.evaluate(() => window.scrollY + document.querySelector(".story").getBoundingClientRect().top));
  for (let i = 0; i < 4; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), top + (box.height - 900) * (i / 3.02));
    await page.waitForTimeout(1100);
    const active = await page.locator(".story-step.is-active h3").innerText();
    t.check(`landing: story step ${i + 1} active (${active})`, active.length > 3);
    await page.screenshot({ path: `${SHOTS}/story-${i + 1}.png` });
  }
  const seen = await page.evaluate(() => [...document.querySelectorAll(".story-step")].map((e) => e.classList.contains("is-active")));
  t.check("landing: exactly one story step active at the end", seen.filter(Boolean).length === 1 && seen[3] === true, JSON.stringify(seen));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(1500);
  t.check("landing: jumping to the bottom leaves no hidden content behind", (await page.locator(".rv:not(.rv-in)").count()) === 0, `left=${await page.locator(".rv:not(.rv-in)").count()}`);
  t.check("landing: no console errors", errs.length === 0, errs.join(" | "));
  await ctx.close();

  // ---- reduced motion shows everything immediately
  ctx = await context(browser, null, { reducedMotion: "reduce" }); page = await ctx.newPage();
  await page.goto(BASE); await page.waitForTimeout(500);
  const hidden = await page.locator(".rv").evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity === "0").length);
  t.check("reduced motion: nothing stays invisible", hidden === 0, `hidden=${hidden}`);
  t.check("reduced motion: story falls back to a plain list", (await page.locator(".story").count()) === 0);
  await ctx.close();

  // ---- student
  ctx = await context(browser, "student@test.local"); page = await ctx.newPage(); errs = watch(page);
  await page.goto(`${BASE}/student`); await page.getByText("Quick actions", { exact: false }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${SHOTS}/student-dashboard.png` });
  t.check("student: greeting shown", /Good (morning|afternoon|evening)|Good night|Burning/.test(await page.locator("h1").first().innerText()));
  t.check("student: quick actions + ring + pipeline present", (await page.locator('[aria-label="Quick actions"] a').count()) === 5 && (await page.locator(".ring-draw").count()) === 1 && (await page.getByText("Application pipeline").count()) === 1);
  const pillTop = await page.locator(".nav-pill").evaluate((e) => e.style.transform);
  t.check("student: sidebar pill sits on Overview", pillTop === "translateY(0px)", pillTop);
  await page.getByRole("link", { name: "Settings" }).first().click(); await page.waitForURL("**/student/settings");
  await page.getByRole("tab", { name: "Account" }).waitFor();
  t.check("student: settings page has 5 tabs", (await page.getByRole("tab").count()) === 5);
  const pill2 = await page.locator(".nav-pill").evaluate((e) => e.style.transform);
  t.check("student: sidebar pill moved to Settings", pill2 === "translateY(240px)", pill2);
  // account
  await page.getByLabel("Full name").fill("Asha Kumar"); await page.getByLabel("Phone (optional)").fill("+91 98765 43210");
  await page.getByRole("button", { name: "Save changes" }).click(); await page.getByText("Account details saved.").waitFor({ timeout: 8000 }).catch(() => {});
  const prof = (await db.query("select full_name, phone from profiles where id=$1", [await uid("student@test.local")])).rows[0];
  t.check("student: account saved in the database", prof.full_name === "Asha Kumar" && prof.phone === "+91 98765 43210", JSON.stringify(prof));
  await page.getByLabel("Phone (optional)").fill("abc"); await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("Use 7 to 20 digits").waitFor({ timeout: 8000 }).catch(() => {});
  t.check("student: bad phone is rejected by the server", (await page.getByText("Use 7 to 20 digits").count()) === 1);
  // notifications + preferences share one row
  await page.getByRole("tab", { name: "Notifications" }).click();
  await page.getByRole("switch", { name: "Community replies" }).click();
  await page.getByLabel("Summary email").selectOption("daily");
  await page.getByRole("tab", { name: "Preferences" }).click();
  await page.getByRole("switch", { name: "Open to opportunities" }).click();
  await page.getByRole("tabpanel").locator("label", { hasText: "Part-time" }).click(); // chip
  await page.getByRole("button", { name: "Save changes" }).first().click(); await page.getByText("Preferences saved.").first().waitFor({ timeout: 8000 }).catch(() => {});
  await page.screenshot({ path: `${SHOTS}/student-prefs.png`, fullPage: true });
  const row = (await db.query("select data from user_settings where user_id=$1", [await uid("student@test.local")])).rows[0]?.data;
  t.check("student: notification change stored", row?.notifications?.community === true && row?.notifications?.digest === "daily", JSON.stringify(row));
  t.check("student: preference change stored (both tabs in one save)", row?.prefs?.openToWork === false && row?.prefs?.jobTypes?.includes("part_time"), JSON.stringify(row?.prefs));
  await page.reload(); await page.getByRole("tab", { name: "Notifications" }).click();
  t.check("student: saved switch is still on after reload", (await page.getByRole("switch", { name: "Community replies" }).getAttribute("aria-checked")) === "true");
  // keyboard on tabs
  await page.getByRole("tab", { name: "Notifications" }).focus(); await page.keyboard.press("ArrowRight");
  t.check("student: arrow key moves between tabs", (await page.getByRole("tab", { name: "Preferences" }).getAttribute("aria-selected")) === "true");
  await page.getByRole("tab", { name: "Appearance" }).click(); await page.waitForTimeout(600);
  t.check("student: appearance tab shows the appearance controls", (await page.getByText("Accent", { exact: false }).count()) > 0);
  await page.getByRole("tab", { name: "Security" }).click();
  await page.getByLabel("New password", { exact: true }).fill("short"); await page.getByLabel("Confirm new password").fill("short");
  await page.getByRole("button", { name: "Change password" }).click(); await page.getByText("Use at least 8 characters.").waitFor({ timeout: 8000 }).catch(() => {});
  t.check("student: weak password is refused", (await page.getByText("Use at least 8 characters.").count()) === 1);
  await page.screenshot({ path: `${SHOTS}/student-security.png`, fullPage: true });
  t.check("student: no console errors", errs.length === 0, errs.join(" | "));
  await ctx.close();

  // ---- employer
  ctx = await context(browser, "employer@test.local"); page = await ctx.newPage(); errs = watch(page);
  await page.goto(`${BASE}/employer`); await page.getByText("Hiring pipeline").waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2200); await page.screenshot({ path: `${SHOTS}/employer-dashboard.png`, fullPage: true });
  t.check("employer: quick actions + pipeline present", (await page.locator('[aria-label="Quick actions"] a').count()) === 4 && (await page.getByText("Hiring pipeline").count()) === 1);
  await page.goto(`${BASE}/employer/settings`); await page.getByRole("tab", { name: "Preferences" }).click();
  await page.getByLabel("Default opportunity type").selectOption("freelance"); await page.getByLabel("Default work style").selectOption("remote");
  await page.getByRole("switch", { name: "Send an auto-reply" }).click();
  await page.getByLabel("Message").fill("Thank you for applying to us!");
  await page.screenshot({ path: `${SHOTS}/employer-prefs.png`, fullPage: true });
  await page.getByRole("button", { name: "Save changes" }).click(); await page.getByText("Preferences saved.").first().waitFor({ timeout: 8000 }).catch(() => {});
  const erow = (await db.query("select data from user_settings where user_id=$1", [await uid("employer@test.local")])).rows[0]?.data;
  t.check("employer: hiring defaults + auto-reply stored", erow?.prefs?.defaultJobType === "freelance" && erow?.prefs?.autoReply === true && erow?.prefs?.autoReplyText === "Thank you for applying to us!", JSON.stringify(erow));
  await page.goto(`${BASE}/employer/jobs/new`); await page.getByLabel("Role title").waitFor({ timeout: 8000 });
  t.check("employer: Post a role form is pre-filled from defaults", (await page.getByLabel("Type", { exact: true }).inputValue()) === "freelance" && (await page.getByLabel("Work mode").inputValue()) === "remote");
  t.check("employer: sidebar pill on Post a role only", (await page.locator('a[aria-current="page"]').count()) >= 1 && (await page.locator('nav a[aria-current="page"]').first().innerText()).includes("Post a role"));
  t.check("employer: no console errors", errs.length === 0, errs.join(" | "));
  // student cannot open employer settings
  await ctx.close();
  ctx = await context(browser, "student@test.local"); page = await ctx.newPage();
  await page.goto(`${BASE}/employer/settings`); await page.waitForTimeout(800);
  t.check("security: a student is bounced away from employer settings", !page.url().includes("/employer/settings"), page.url());
  await ctx.close();
  // mobile
  ctx = await context(browser, "employer@test.local", { viewport: { width: 390, height: 844 } }); page = await ctx.newPage();
  await page.goto(`${BASE}/employer/settings`); await page.getByRole("tab", { name: "Account" }).waitFor({ timeout: 8000 }); await page.waitForTimeout(600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  await page.screenshot({ path: `${SHOTS}/mobile-settings.png` });
  t.check("mobile: settings has no sideways page scroll", !overflow);
  await ctx.close();
} finally { await db.query("delete from companies where slug='settings-e2e-co'"); await browser.close(); await db.end(); }
process.exit(t.done() ? 0 : 1);
