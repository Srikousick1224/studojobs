import assert from "node:assert/strict";
import { test } from "node:test";
import { accountInput, employerSettings, jobFormDefaults, passwordInput, readSettings, studentSettings, DEFAULT_EMPLOYER, DEFAULT_STUDENT } from "../src/lib/settings/schema";

test("account: name rules and optional phone", () => {
  assert.ok(accountInput.safeParse({ fullName: "Asha K", phone: "" }).success);
  assert.ok(accountInput.safeParse({ fullName: "Asha K", phone: "+91 98765 43210" }).success);
  assert.ok(!accountInput.safeParse({ fullName: "A" }).success);
  assert.ok(!accountInput.safeParse({ fullName: "<b>x</b>" }).success);
  assert.ok(!accountInput.safeParse({ fullName: "Asha K", phone: "abc" }).success);
});

test("password: same rules as registration", () => {
  assert.ok(passwordInput.safeParse({ password: "abcdefg1", confirmPassword: "abcdefg1" }).success);
  assert.ok(!passwordInput.safeParse({ password: "short1", confirmPassword: "short1" }).success);
  assert.ok(!passwordInput.safeParse({ password: "onlyletters", confirmPassword: "onlyletters" }).success);
  assert.ok(!passwordInput.safeParse({ password: "abcdefg1", confirmPassword: "abcdefg2" }).success);
});

test("stored settings: defaults fill gaps and bad data falls back", () => {
  assert.deepEqual(readSettings("student", null), DEFAULT_STUDENT);
  assert.deepEqual(readSettings("employer", undefined), DEFAULT_EMPLOYER);
  const partial = readSettings<typeof DEFAULT_STUDENT>("student", { notifications: { digest: "daily" }, prefs: { openToWork: false } });
  assert.equal(partial.notifications.digest, "daily");
  assert.equal(partial.prefs.openToWork, false);
  assert.equal(partial.prefs.visibleToEmployers, true);
  assert.deepEqual(readSettings("student", { prefs: { jobTypes: ["astronaut"] } }), DEFAULT_STUDENT);
});

test("settings payloads are strict about shape and length", () => {
  assert.ok(studentSettings.safeParse(DEFAULT_STUDENT).success);
  assert.ok(employerSettings.safeParse(DEFAULT_EMPLOYER).success);
  assert.ok(!studentSettings.safeParse({ ...DEFAULT_STUDENT, prefs: { ...DEFAULT_STUDENT.prefs, availability: "never" } }).success);
  assert.ok(!employerSettings.safeParse({ ...DEFAULT_EMPLOYER, prefs: { ...DEFAULT_EMPLOYER.prefs, autoReplyText: "x".repeat(501) } }).success);
  assert.ok(!studentSettings.safeParse(DEFAULT_EMPLOYER).success, "an employer payload is not a student payload");
});

test("employer defaults map onto the Post-a-role form values", () => {
  const p = DEFAULT_EMPLOYER.prefs;
  assert.deepEqual(jobFormDefaults({ ...p, defaultJobType: "internship", defaultWorkMode: "remote" }), { type: "internship", level: "internship", employment: "full_time", workMode: "remote" });
  assert.deepEqual(jobFormDefaults({ ...p, defaultJobType: "part_time" }), { type: "job", level: "entry", employment: "part_time", workMode: p.defaultWorkMode });
  assert.equal(jobFormDefaults({ ...p, defaultJobType: "freelance" }).type, "freelance");
});
