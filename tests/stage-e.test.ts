/**
 * Unit tests for the Stage E pure rules (no network, no Supabase).
 * Run: npm run test:stage-e
 */
import test from "node:test";
import assert from "node:assert/strict";
import { canStudentWithdraw, employerNextStatuses, STATUS_LABEL, EMPLOYER_SETTABLE, APPLICATION_STAGES } from "../src/lib/stage-e/status";
import { employerStatusInput, moderationDecisionInput, reportDecisionInput, verificationDecisionInput, applicationIdInput } from "../src/lib/stage-e/schemas";

const ID = "3f2a9c1e-8b7d-4e6f-9a10-2b3c4d5e6f70";

test("student can withdraw only active applications", () => {
  for (const s of ["applied", "under_review", "shortlisted", "interview_scheduled"] as const) assert.equal(canStudentWithdraw(s), true, s);
  for (const s of ["selected", "rejected", "withdrawn"] as const) assert.equal(canStudentWithdraw(s), false, s);
});

test("employer can never set applied, withdrawn or interview_scheduled by hand", () => {
  for (const bad of ["applied", "withdrawn", "interview_scheduled"]) {
    assert.equal(employerStatusInput.safeParse({ applicationId: ID, status: bad }).success, false, bad);
    assert.ok(!(EMPLOYER_SETTABLE as readonly string[]).includes(bad), bad);
  }
});

test("employer next statuses exclude the current one and are empty once withdrawn", () => {
  assert.deepEqual(employerNextStatuses("withdrawn"), []);
  assert.ok(!employerNextStatuses("under_review").includes("under_review"));
  assert.ok(employerNextStatuses("applied").includes("shortlisted"));
  assert.ok(employerNextStatuses("applied").includes("rejected"));
});

test("employer status input accepts valid choices only", () => {
  assert.equal(employerStatusInput.safeParse({ applicationId: ID, status: "shortlisted" }).success, true);
  assert.equal(employerStatusInput.safeParse({ applicationId: "not-a-uuid", status: "shortlisted" }).success, false);
  assert.equal(employerStatusInput.safeParse({ applicationId: ID, status: "hired" }).success, false);
});

test("admin decisions are restricted to their own vocabulary", () => {
  assert.equal(moderationDecisionInput.safeParse({ jobId: ID, decision: "published" }).success, true);
  assert.equal(moderationDecisionInput.safeParse({ jobId: ID, decision: "closed" }).success, false);
  assert.equal(verificationDecisionInput.safeParse({ verificationId: ID, decision: "approved" }).success, true);
  assert.equal(verificationDecisionInput.safeParse({ verificationId: ID, decision: "pending" }).success, false);
  assert.equal(reportDecisionInput.safeParse({ reportId: ID, decision: "resolved" }).success, true);
  assert.equal(reportDecisionInput.safeParse({ reportId: ID, decision: "investigating" }).success, false);
});

test("ids must be real UUIDs", () => {
  assert.equal(applicationIdInput.safeParse({ applicationId: "1; drop table" }).success, false);
  assert.equal(applicationIdInput.safeParse({ applicationId: ID }).success, true);
});

test("every stage and status has a human label", () => {
  for (const s of APPLICATION_STAGES) assert.ok(STATUS_LABEL[s].length > 0, s);
  assert.equal(STATUS_LABEL.rejected, "Not selected");
});

import { daysSince, payLabel, reasonLabel } from "../src/lib/stage-e/format";

test("daysSince counts whole days and never goes negative", () => {
  const now = Date.parse("2026-11-04T12:00:00Z");
  assert.equal(daysSince("2026-11-01T12:00:00Z", now), 3);
  assert.equal(daysSince("2026-11-04T10:00:00Z", now), 0);
  assert.equal(daysSince("2026-11-09T00:00:00Z", now), 0);
  assert.equal(daysSince("not a date", now), 0);
});

test("unpaid roles are labelled Unpaid; paid roles show a range", () => {
  assert.equal(payLabel({ is_paid: false, pay_min: null, pay_max: null, pay_period: null, pay_currency: "INR" }), "Unpaid");
  const paid = payLabel({ is_paid: true, pay_min: "15000.00", pay_max: "20000.00", pay_period: "month", pay_currency: "INR" });
  assert.match(paid, /15,000.*20,000.*\/ month/);
});

test("unknown report reasons fall back to Other", () => {
  assert.equal(reasonLabel("asks_for_money"), "Asks for money");
  assert.equal(reasonLabel("made_up"), "Other");
});
