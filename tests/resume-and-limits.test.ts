import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { _resetRateLimits, rateLimit, tooManyMessage } from "../src/lib/security/rate-limit";
import { checkResumeFile, cleanFileName, cleanLabel, MAX_RESUME_BYTES } from "../src/lib/student/resume-file";

const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
const exe = Uint8Array.from([0x4d, 0x5a, 0x90, 0, 0, 0, 0, 0]);

test("resume: real PDF and DOCX pass", () => {
  assert.deepEqual(checkResumeFile({ name: "cv.PDF", size: 1000, head: pdf }), { ok: true, ext: "pdf", mime: "application/pdf" });
  const d = checkResumeFile({ name: "cv.docx", size: 1000, head: zip });
  assert.ok(d.ok && d.ext === "docx");
});
test("resume: disguised or wrong files are refused", () => {
  assert.ok(!checkResumeFile({ name: "virus.pdf", size: 1000, head: exe }).ok, "exe renamed to .pdf");
  assert.ok(!checkResumeFile({ name: "x.docx", size: 1000, head: pdf }).ok, "pdf renamed to .docx");
  assert.ok(!checkResumeFile({ name: "photo.png", size: 1000, head: pdf }).ok, "wrong extension");
  assert.ok(!checkResumeFile({ name: "cv.pdf.exe", size: 1000, head: pdf }).ok, "double extension");
  assert.ok(!checkResumeFile({ name: "cv.pdf", size: 0, head: pdf }).ok, "empty");
  assert.ok(!checkResumeFile({ name: "cv.pdf", size: MAX_RESUME_BYTES + 1, head: pdf }).ok, "too big");
  assert.ok(checkResumeFile({ name: "cv.pdf", size: MAX_RESUME_BYTES, head: pdf }).ok, "exactly 5 MB is allowed");
});
test("resume: labels and file names are cleaned", () => {
  assert.equal(cleanLabel("  ", "My CV.pdf"), "My CV");
  assert.equal(cleanLabel("<b>Data</b>\u0000 CV", "x.pdf"), "bData/b CV");
  assert.equal(cleanLabel("x".repeat(200), "x.pdf").length, 80);
  assert.equal(cleanFileName("../../etc/passwd.pdf"), "....etcpasswd.pdf");
});

beforeEach(() => _resetRateLimits());
test("rate limit: allows up to max, then blocks, then recovers after the window", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 3; i++) assert.ok(rateLimit("k", 3, 60_000, t0 + i).ok);
  const blocked = rateLimit("k", 3, 60_000, t0 + 10);
  assert.ok(!blocked.ok && blocked.retryAfterSec >= 59);
  assert.ok(rateLimit("other", 3, 60_000, t0 + 10).ok, "other keys are independent");
  assert.ok(rateLimit("k", 3, 60_000, t0 + 60_001).ok, "window reset");
  assert.match(tooManyMessage({ ok: false, retryAfterSec: 600 }), /10 minutes/);
});
