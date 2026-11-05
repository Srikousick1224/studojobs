/**
 * Unit tests for the pure auth rules (no network, no Supabase).
 * Run: npm run test:auth
 */
import test from "node:test";
import assert from "node:assert/strict";
import { registerSchema, loginSchema, resetSchema, emailOnlySchema, onboardingSchema } from "../src/lib/auth/schemas";
import { loginErrorMessage } from "../src/lib/auth/messages";
import { postLoginPath, dashboardRoleForPath, viewerHome, ROLE_HOME } from "../src/lib/auth/roles";
import { safeNextPath } from "../src/lib/safe-redirect";

const good = { accountType: "student", fullName: "Asha Rao", email: "Asha@Example.com ", password: "abcd1234", confirmPassword: "abcd1234" };

test("register: valid student passes and email is normalised", () => {
  const r = registerSchema.safeParse(good);
  assert.ok(r.success);
  assert.equal(r.data.email, "asha@example.com");
});
test("register: employer passes", () => assert.ok(registerSchema.safeParse({ ...good, accountType: "employer" }).success));
test("register: admin account type is rejected", () => assert.equal(registerSchema.safeParse({ ...good, accountType: "admin" }).success, false));
test("register: missing/unknown account type is rejected", () => {
  assert.equal(registerSchema.safeParse({ ...good, accountType: "" }).success, false);
  assert.equal(registerSchema.safeParse({ ...good, accountType: "superuser" }).success, false);
});
test("register: password rules", () => {
  for (const password of ["short1", "abcdefgh", "12345678", "a".repeat(73) + "1"]) {
    assert.equal(registerSchema.safeParse({ ...good, password, confirmPassword: password }).success, false, password.slice(0, 10));
  }
});
test("register: confirm password must match", () => {
  const r = registerSchema.safeParse({ ...good, confirmPassword: "different1" });
  assert.equal(r.success, false);
  assert.equal(r.error?.issues[0].path[0], "confirmPassword");
});
test("register: bad emails and names rejected", () => {
  for (const email of ["", "nope", "a@b", "a b@c.com"]) assert.equal(registerSchema.safeParse({ ...good, email }).success, false, email);
  for (const fullName of ["", "A", "x".repeat(101), "Bob <script>"]) assert.equal(registerSchema.safeParse({ ...good, fullName }).success, false, fullName);
});
test("login / forgot / reset schemas", () => {
  assert.ok(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success);
  assert.equal(loginSchema.safeParse({ email: "a@b.co", password: "" }).success, false);
  assert.ok(emailOnlySchema.safeParse({ email: "a@b.co" }).success);
  assert.equal(emailOnlySchema.safeParse({ email: "x" }).success, false);
  assert.ok(resetSchema.safeParse({ password: "abcd1234", confirmPassword: "abcd1234" }).success);
  assert.equal(resetSchema.safeParse({ password: "abcd1234", confirmPassword: "abcd12345" }).success, false);
});

test("safeNextPath blocks open redirects", () => {
  for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com", "", null, undefined]) {
    assert.equal(safeNextPath(bad as string | null | undefined, "/x"), "/x", String(bad));
  }
  assert.equal(safeNextPath("/jobs?q=a", "/x"), "/jobs?q=a");
});

test("postLoginPath: role decides the dashboard", () => {
  assert.equal(postLoginPath(undefined, "student"), "/student");
  assert.equal(postLoginPath(null, "employer"), "/employer");
  assert.equal(postLoginPath("", "admin"), "/admin");
});
test("postLoginPath: ?next= is honoured only inside the user's own area or public pages", () => {
  assert.equal(postLoginPath("/student/saved", "student"), "/student/saved");
  assert.equal(postLoginPath("/jobs/j-101", "student"), "/jobs/j-101");
  assert.equal(postLoginPath("/admin", "student"), "/student");
  assert.equal(postLoginPath("/admin/moderation?x=1", "employer"), "/employer");
  assert.equal(postLoginPath("/employer", "student"), "/student");
  assert.equal(postLoginPath("/student", "admin"), "/admin");
});
test("postLoginPath: open-redirect and auth-page loops fall back to home", () => {
  assert.equal(postLoginPath("//evil.com", "student"), "/student");
  assert.equal(postLoginPath("https://evil.com", "employer"), "/employer");
  assert.equal(postLoginPath("/login", "student"), "/student");
  assert.equal(postLoginPath("/auth/callback", "student"), "/student");
  assert.equal(postLoginPath("/reset-password", "employer"), "/employer");
});
test("dashboardRoleForPath", () => {
  assert.equal(dashboardRoleForPath("/student"), "student");
  assert.equal(dashboardRoleForPath("/employer/jobs/new"), "employer");
  assert.equal(dashboardRoleForPath("/admin/moderation"), "admin");
  assert.equal(dashboardRoleForPath("/students"), null);
  assert.equal(dashboardRoleForPath("/jobs"), null);
  assert.deepEqual(Object.keys(ROLE_HOME).sort(), ["admin", "employer", "student"]);
});

test("onboarding schema: student/employer only, never admin", () => {
  assert.ok(onboardingSchema.safeParse({ accountType: "student", fullName: "Asha Rao" }).success);
  assert.ok(onboardingSchema.safeParse({ accountType: "employer", fullName: "Ravi Menon" }).success);
  for (const accountType of ["admin", "", "root", undefined]) assert.equal(onboardingSchema.safeParse({ accountType, fullName: "Asha Rao" }).success, false, String(accountType));
  assert.equal(onboardingSchema.safeParse({ accountType: "student", fullName: "A" }).success, false);
});
test("viewerHome: suspended > needs onboarding > role dashboard", () => {
  assert.equal(viewerHome({ role: "employer", isSuspended: true, onboarded: false }), "/auth/suspended");
  assert.equal(viewerHome({ role: "student", isSuspended: false, onboarded: false }), "/onboarding");
  assert.equal(viewerHome({ role: "employer", isSuspended: false, onboarded: true }), "/employer");
  assert.equal(postLoginPath("/onboarding", "student"), "/student");
});
test("login error codes: only known codes produce a message", () => {
  assert.ok(loginErrorMessage("oauth_cancelled"));
  assert.equal(loginErrorMessage("<script>alert(1)</script>"), undefined);
  assert.equal(loginErrorMessage("toString"), undefined);
  assert.equal(loginErrorMessage(undefined), undefined);
});
