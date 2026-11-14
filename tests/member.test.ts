import assert from "node:assert/strict";
import { test } from "node:test";
import { listingReportInput } from "../src/lib/report/schema";
import { profileInput } from "../src/lib/student/profile-schema";

const uuid = "7d0b799b-15df-432e-9e1c-feca03d3a39d";

test("report: accepts a clear report", () => {
  assert.equal(listingReportInput.safeParse({ jobId: uuid, reason: "asks_for_money", details: "They asked for a 2000 rupee fee." }).success, true);
});
test("report: rejects unknown reasons, short details, bad ids", () => {
  assert.equal(listingReportInput.safeParse({ jobId: uuid, reason: "bogus", details: "x".repeat(30) }).success, false);
  assert.equal(listingReportInput.safeParse({ jobId: uuid, reason: "other", details: "too short" }).success, false);
  assert.equal(listingReportInput.safeParse({ jobId: "nope", reason: "other", details: "x".repeat(30) }).success, false);
  assert.equal(listingReportInput.safeParse({ jobId: uuid, reason: "other", details: "x".repeat(2001) }).success, false);
});
test("profile: valid input, blanks become undefined", () => {
  const r = profileInput.safeParse({ fullName: " Harish ", college: "ABC University", headline: "", skills: ["Python", "SQL"], graduationYear: 2029 });
  assert.equal(r.success, true);
  if (r.success) { assert.equal(r.data.fullName, "Harish"); assert.equal(r.data.headline, undefined); }
});
test("profile: rejects missing college, duplicate skills (case-insensitive), too many or too long skills", () => {
  assert.equal(profileInput.safeParse({ fullName: "Harish", college: "", skills: [] }).success, false);
  assert.equal(profileInput.safeParse({ fullName: "Harish", college: "ABC", skills: ["Python", "python"] }).success, false);
  assert.equal(profileInput.safeParse({ fullName: "Harish", college: "ABC", skills: Array.from({ length: 21 }, (_, i) => `s${i}`) }).success, false);
  assert.equal(profileInput.safeParse({ fullName: "Harish", college: "ABC", skills: ["x".repeat(41)] }).success, false);
});
