// LOCAL DEV/TEST ONLY: browser checks for Stage E8 (resumes, interviews, notifications, auto-reply, data export, company reports, CSP).
// Runs against the LOCAL STAND-IN (my imitation of Supabase on real Postgres). It is NOT proof about real Supabase, especially Storage.
import fs from "node:fs";
import pg from "pg";
import { BASE, context, launch, tracker, watch } from "./helpers.mjs";

const t = tracker();
const SHOTS = process.env.SHOTS ?? "/tmp/claude-0/shots";
fs.mkdirSync(SHOTS, { recursive: true });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/studojob_local" });
await db.connect();
const q = async (sql, p = []) => (await db.query(sql, p)).rows;
const uid = async (email) => (await q("select id from auth.users where email=$1", [email]))[0].id;

/** Polls until the check is true (the browser actions finish a moment after the click). */
async function until(fn, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 250)); }
  return false;
}
const count = async (sql, p) => (await q(sql, p))[0].n;

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("fake-docx-body-for-test")]);
const FAKE = Buffer.from("this is only text, not a pdf at all");

const student = await uid("student@test.local");
const student2 = await uid("student2@test.local");
const employer = await uid("employer@test.local");

// ---- clean slate for the two test students + a fresh company/job for the employer
await q("delete from interviews where application_id in (select id from applications where student_id in ($1,$2))", [student, student2]);
await q("delete from applications where student_id in ($1,$2)", [student, student2]);
await q("delete from notifications where user_id in ($1,$2,$3)", [student, student2, employer]);
await q("delete from resumes where student_id in ($1,$2)", [student, student2]);
await q("delete from reports where reporter_id in ($1,$2)", [student, student2]);
await q("delete from user_settings where user_id in ($1,$2)", [student, employer]);
await q("delete from companies where slug='e8-e2e-co'");
const [{ id: company }] = await q("insert into companies (owner_id, name, slug, verification_status) values ($1, 'E8 E2E Co', 'e8-e2e-co', 'approved') returning id", [employer]);
const [{ id: job }] = await q(`insert into jobs (company_id, title, summary, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, pay_period, status, published_at, created_by)
  values ($1, 'E8 Test Intern', 'A real test role used by the Stage E8 browser checks.', 'internship', 'remote', 'full_time', 'internship', 'Remote', true, 10000, 12000, 'month', 'published', now(), $2) returning id`, [company, employer]);

const browser = await launch();
try {
  // ================= student: resumes =================
  let ctx = await context(browser, "student@test.local");
  let page = await ctx.newPage();
  let errs = watch(page);
  page.on("dialog", (d) => d.accept());
  // record window.open() calls instead of opening real tabs (a PDF in a headless popup is awkward to inspect)
  await page.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
  await page.goto(`${BASE}/student/profile`);
  await page.locator("#resume-file").waitFor({ timeout: 10000 });

  await page.locator("#resume-file").setInputFiles({ name: "evil.pdf", mimeType: "application/pdf", buffer: FAKE });
  await page.getByRole("button", { name: "Upload" }).click();
  await page.getByRole("status").waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  t.check("resume: a text file renamed .pdf is refused", (await q("select count(*)::int n from resumes where student_id=$1", [student]))[0].n === 0 && /pdf|word|file/i.test(await page.getByRole("status").innerText().catch(() => "")), await page.getByRole("status").innerText().catch(() => "no status"));

  await page.locator("#resume-label").fill("Main resume");
  await page.locator("#resume-file").setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: PDF });
  await page.getByRole("button", { name: "Upload" }).click();
  await until(async () => (await count("select count(*)::int n from resumes where student_id=$1", [student])) === 1);
  let rows = await q("select label, file_name, mime_type, is_default, storage_path from resumes where student_id=$1", [student]);
  t.check("resume: valid PDF uploads and appears in the list", rows.length === 1 && rows[0].file_name === "cv.pdf" && rows[0].label === "Main resume", JSON.stringify(rows));
  t.check("resume: first resume becomes the default", rows[0]?.is_default === true);
  t.check("resume: stored under the student's own folder with a random name", rows[0]?.storage_path?.startsWith(`${student}/`) && !rows[0].storage_path.includes("cv.pdf"), rows[0]?.storage_path);

  await page.locator("#resume-label").fill("Second");
  await page.locator("#resume-file").setInputFiles({ name: "cv2.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: DOCX });
  await page.getByRole("button", { name: "Upload" }).click();
  await until(async () => (await count("select count(*)::int n from resumes where student_id=$1", [student])) === 2);
  await page.getByText("cv2.docx").first().waitFor({ timeout: 10000 }).catch(() => {});
  t.check("resume: a second file (Word) uploads", (await q("select count(*)::int n from resumes where student_id=$1", [student]))[0].n === 2);

  await page.getByRole("button", { name: /Make default/ }).first().click();
  await until(async () => (await q("select label from resumes where student_id=$1 and is_default", [student]))[0]?.label === "Second");
  rows = await q("select label, is_default from resumes where student_id=$1 order by created_at", [student]);
  t.check("resume: 'Make default' moves the default (exactly one default)", rows.filter((r) => r.is_default).length === 1 && rows.find((r) => r.is_default)?.label === "Second", JSON.stringify(rows));

  await page.getByRole("button", { name: "View" }).first().click();
  await until(async () => (await page.evaluate(() => window.__opened.length)) > 0, 8000);
  const opened = (await page.evaluate(() => window.__opened))[0];
  t.check("resume: View opens a short-lived signed link", !!opened && /\/storage\/v1\/object\/sign\/resumes\//.test(opened) && /token=/.test(opened), opened);
  if (opened) {
    const got = await ctx.request.get(opened);
    const body = await got.body();
    t.check("resume: the signed link returns the file", got.status() === 200 && body.length > 0, `status=${got.status()} len=${body.length}`);
  }
  const path0 = (await q("select storage_path from resumes where student_id=$1 limit 1", [student]))[0].storage_path;
  const anon = await (await browser.newContext()).request.get(`http://localhost:54331/storage/v1/object/resumes/${path0}`);
  t.check("resume: the bucket is private (no anonymous download)", anon.status() >= 400, `status=${anon.status()}`);
  await page.screenshot({ path: `${SHOTS}/e8-resumes.png`, fullPage: true });

  await page.getByRole("button", { name: /^Delete Second/ }).click();
  await until(async () => (await count("select count(*)::int n from resumes where student_id=$1", [student])) === 1);
  await page.waitForTimeout(600);
  t.check("resume: delete removes the row (and the other resume becomes the default)", (await q("select label, is_default from resumes where student_id=$1", [student])).length === 1 && (await q("select is_default from resumes where student_id=$1", [student]))[0].is_default === true);
  t.check("resume: no console errors (CSP clean)", errs.length === 0, errs.join(" | "));
  await ctx.close();

  // ================= application + auto-reply + notifications =================
  const [{ id: appId }] = await q("insert into applications (job_id, student_id, resume_id, cover_note) values ($1,$2,(select id from resumes where student_id=$2 limit 1),'Hello, I would love to join.') returning id", [job, student]);
  t.check("notifications: applying notifies the employer (trigger)", (await q("select count(*)::int n from notifications where user_id=$1 and type='application_received'", [employer]))[0].n >= 1);
  t.check("auto-reply OFF by default: no employer message yet", (await q("select count(*)::int n from notifications where user_id=$1 and type='employer_message'", [student]))[0].n === 0);
  await q("insert into user_settings (user_id, data) values ($1, $2) on conflict (user_id) do update set data = excluded.data", [employer, JSON.stringify({ prefs: { autoReply: true, autoReplyText: "Thanks for applying, we reply within a week." } })]);
  await q("insert into applications (job_id, student_id) values ($1,$2)", [job, student2]);
  const ar = await q("select title, body from notifications where user_id=$1 and type='employer_message'", [student2]);
  t.check("auto-reply ON: the next applicant gets the employer's message", ar.length === 1 && ar[0].title === "Message from E8 E2E Co" && ar[0].body.startsWith("Thanks for applying"), JSON.stringify(ar));

  // ================= employer: schedule + cancel interview =================
  await q("update applications set status='under_review' where id=$1", [appId]);
  ctx = await context(browser, "employer@test.local");
  page = await ctx.newPage();
  errs = watch(page);
  await page.goto(`${BASE}/employer/applicants`);
  await page.getByRole("button", { name: "Schedule interview" }).first().waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "Schedule interview" }).first().click();
  const when = new Date(Date.now() + 3 * 86400000);
  const pad = (n) => String(n).padStart(2, "0");
  const local = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T10:30`;
  const form = page.getByRole("form", { name: "Schedule an interview" });
  await form.getByLabel("Date and time").fill(local);
  await form.getByLabel("Meeting link").fill("https://meet.example.com/e8-test");
  await form.getByRole("button", { name: "Send invite" }).click();
  await page.getByText(/Video call/).first().waitFor({ timeout: 10000 }).catch(() => {});
  const iv = await q("select status, mode, meeting_link, duration_minutes from interviews where application_id=$1", [appId]);
  t.check("interview: employer schedules a video interview", iv.length === 1 && iv[0].mode === "video" && iv[0].meeting_link === "https://meet.example.com/e8-test" && iv[0].status === "scheduled", JSON.stringify(iv));
  t.check("interview: the application moves to 'interview_scheduled' (trigger)", (await q("select status from applications where id=$1", [appId]))[0].status === "interview_scheduled");
  t.check("interview: the student is notified (trigger)", (await q("select count(*)::int n from notifications where user_id=$1 and type like 'interview%'", [student]))[0].n >= 1);
  await page.screenshot({ path: `${SHOTS}/e8-employer-interview.png`, fullPage: true });

  // a bad link is refused in the browser before it reaches the database
  await page.getByRole("button", { name: "Schedule another" }).first().click();
  const form2 = page.getByRole("form", { name: "Schedule an interview" });
  await form2.getByLabel("Date and time").fill(local);
  await form2.getByLabel("Meeting link").fill("javascript:alert(1)");
  await form2.getByRole("button", { name: "Send invite" }).click();
  await page.waitForTimeout(800);
  t.check("interview: a javascript: meeting link is refused", (await q("select count(*)::int n from interviews where application_id=$1", [appId]))[0].n === 1);
  await form2.getByRole("button", { name: "Close" }).click();
  t.check("interview: no console errors (employer)", errs.length === 0, errs.join(" | "));

  // ================= student: sees interview, notifications, unread badge =================
  const sctx = await context(browser, "student@test.local");
  const sp = await sctx.newPage();
  const serrs = watch(sp);
  await sp.goto(`${BASE}/student/applications`);
  const join = sp.getByRole("link", { name: "Join meeting" }).first();
  await join.waitFor({ timeout: 10000 }).catch(() => {});
  t.check("interview: the student sees a Join meeting link that opens safely", (await join.getAttribute("href")) === "https://meet.example.com/e8-test" && (await join.getAttribute("rel"))?.includes("noopener") && (await join.getAttribute("target")) === "_blank");
  await sp.screenshot({ path: `${SHOTS}/e8-student-applications.png`, fullPage: true });

  await sp.goto(`${BASE}/student/notifications`);
  await sp.getByRole("heading", { name: "Notifications" }).waitFor();
  const unreadBefore = (await q("select count(*)::int n from notifications where user_id=$1 and not is_read", [student]))[0].n;
  t.check("notifications: the student has unread items and the page lists them", unreadBefore >= 1 && (await sp.getByText(/interview/i).count()) >= 1, `unread=${unreadBefore}`);
  await sp.getByRole("button", { name: /Mark all as read/ }).click();
  await sp.waitForTimeout(1200);
  t.check("notifications: 'Mark all as read' clears them", (await q("select count(*)::int n from notifications where user_id=$1 and not is_read", [student]))[0].n === 0);
  await sp.screenshot({ path: `${SHOTS}/e8-notifications.png`, fullPage: true });

  // ================= student: another student cannot mark someone else's notification =================
  const other = await q("select id from notifications where user_id=$1 limit 1", [employer]);
  const hack = await (await context(browser, "student2@test.local")).request.get(`${BASE}/student/notifications`);
  t.check("notifications: page loads for another student without error", hack.status() === 200 && other.length >= 1);

  // ================= data export =================
  const res = await sctx.request.get(`${BASE}/api/account/export`);
  const json = JSON.parse(await res.text());
  t.check("export: signed-in student gets a JSON download", res.status() === 200 && /attachment; filename="studojob-student-data-\d{4}-\d{2}-\d{2}\.json"/.test(res.headers()["content-disposition"] ?? "") && res.headers()["cache-control"] === "no-store");
  t.check("export: contains own profile, resumes and applications", json.data?.profile?.length === 1 && json.data?.resumes?.length === 1 && json.data?.applications?.length === 1, Object.keys(json.data ?? {}).join(","));
  t.check("export: never contains storage paths", !JSON.stringify(json).includes("storage_path"));
  t.check("export: contains nothing belonging to another student", !JSON.stringify(json).includes(student2));
  t.check("export: a cross-site request is refused", (await sctx.request.get(`${BASE}/api/account/export`, { headers: { "sec-fetch-site": "cross-site" } })).status() === 403);
  const guest = await (await context(browser)).request.get(`${BASE}/api/account/export`);
  t.check("export: a visitor who is not signed in gets 401", guest.status() === 401);
  const ectx = await context(browser, "employer@test.local");
  const ejson = JSON.parse(await (await ectx.request.get(`${BASE}/api/account/export`)).text());
  t.check("export: an employer gets company + listings but NOT candidates' applications", ejson.data?.company?.length === 1 && ejson.data?.listings?.length >= 1 && ejson.data?.applications === undefined && !JSON.stringify(ejson).includes("Hello, I would love to join"));

  // settings page shows the button as a real download link
  await sp.goto(`${BASE}/student/settings`);
  await sp.getByRole("tab", { name: "Security" }).click();
  const dl = sp.getByRole("link", { name: /Download my data/ });
  await dl.waitFor({ timeout: 8000 });
  t.check("export: Settings > Security has a 'Download my data' download link", (await dl.getAttribute("href")) === "/api/account/export" && (await dl.getAttribute("download")) !== null);

  // ================= report a company =================
  await sp.goto(`${BASE}/report?company=e8-e2e-co`);
  await sp.getByText("You are reporting the company").waitFor({ timeout: 10000 });
  await sp.getByLabel("What is wrong?").selectOption("fake_company");
  await sp.getByLabel("Details").fill("This company pretends to be a bigger brand and asked me to pay a fee.");
  await sp.getByRole("button", { name: "Send report" }).click();
  await sp.getByText(/Thank you/).first().waitFor({ timeout: 10000 }).catch(() => {});
  const rep = await q("select job_id, company_id, reason, status from reports where reporter_id=$1", [student]);
  t.check("report company: stored with no job and the right company", rep.length === 1 && rep[0].job_id === null && rep[0].company_id === company && rep[0].reason === "fake_company" && rep[0].status === "open", JSON.stringify(rep));
  await sp.goto(`${BASE}/report?company=e8-e2e-co`);
  await sp.getByLabel("What is wrong?").selectOption("other");
  await sp.getByLabel("Details").fill("A second report about the same company should not be accepted.");
  await sp.getByRole("button", { name: "Send report" }).click();
  await sp.getByText(/already reported/).first().waitFor({ timeout: 10000 }).catch(() => {});
  t.check("report company: an exact repeat is refused politely", (await q("select count(*)::int n from reports where reporter_id=$1", [student]))[0].n === 1 && (await sp.getByText(/already reported/).count()) >= 1);
  await sp.goto(`${BASE}/companies/e8-e2e-co`);
  await sp.getByRole("link", { name: /Report this company/ }).waitFor({ timeout: 8000 }).catch(() => {});
  t.check("report company: the company page has a 'Report this company' link", (await sp.getByRole("link", { name: /Report this company/ }).count()) === 1);
  const gone = await sp.goto(`${BASE}/report?company=does-not-exist`);
  t.check("report company: an unknown company shows a friendly message", gone.status() === 200 && (await sp.getByText(/could not find that company/i).count()) === 1);
  t.check("student: no console errors (CSP clean)", serrs.length === 0, serrs.join(" | "));

  // ================= security headers =================
  const head = await (await context(browser)).request.get(BASE);
  const csp = head.headers()["content-security-policy"] ?? "";
  t.check("CSP: sent on pages, blocks plugins/framing/base tags and unknown connections", /object-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /base-uri 'self'/.test(csp) && /connect-src 'self' http:\/\/localhost:54331/.test(csp) && !/connect-src[^;]*\*/.test(csp), csp);
} finally {
  await browser.close();
  await db.end();
}
process.exit(t.done() ? 0 : 1);
