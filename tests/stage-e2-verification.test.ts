/**
 * Unit tests for the company verification request rules (no network, no Supabase).
 * Run: npm run test:stage-e2
 */
import test from "node:test";
import assert from "node:assert/strict";
import { verificationFormSchema } from "../src/lib/stage-e/verification-schema";

test("verification: a valid business email is accepted", () => {
  assert.equal(verificationFormSchema.safeParse({ businessEmail: "hr@acme-data.com" }).success, true);
});
test("verification: malformed business email is rejected", () => {
  for (const bad of ["", "hr@", "not-an-email", "a b@c.com", "x@y"]) {
    assert.equal(verificationFormSchema.safeParse({ businessEmail: bad }).success, false, bad);
  }
});
test("verification: length limits match the database", () => {
  assert.equal(verificationFormSchema.safeParse({ businessEmail: "a@b.co", registrationNumber: "x".repeat(61) }).success, false);
  assert.equal(verificationFormSchema.safeParse({ businessEmail: "a@b.co", notes: "x".repeat(1001) }).success, false);
  assert.equal(verificationFormSchema.safeParse({ businessEmail: "a@b.co", registrationNumber: "U72900TN2020PTC", notes: "ok" }).success, true);
});
