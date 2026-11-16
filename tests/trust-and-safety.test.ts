import assert from "node:assert/strict";
import { test } from "node:test";
import { companyReportInput, listingReportInput } from "../src/lib/report/schema";
import { exportFileName, section, shapeExport, stripInternal } from "../src/lib/account/export-shape";

const uuid = "6f1c2a40-8b3e-4c55-9d1a-0a1b2c3d4e5f";
const details = "They asked me to pay a registration fee before the interview.";

test("company report: accepts a valid report", () => {
  assert.equal(companyReportInput.safeParse({ companyId: uuid, reason: "asks_for_money", details }).success, true);
});

test("company report: rejects a bad id, a made-up reason and short details", () => {
  assert.equal(companyReportInput.safeParse({ companyId: "abc", reason: "asks_for_money", details }).success, false);
  assert.equal(companyReportInput.safeParse({ companyId: uuid, reason: "i_dislike_them", details }).success, false);
  const short = companyReportInput.safeParse({ companyId: uuid, reason: "other", details: "too short" });
  assert.equal(short.success, false);
});

test("listing report still needs a job id (the company form did not weaken it)", () => {
  assert.equal(listingReportInput.safeParse({ reason: "other", details }).success, false);
  assert.equal(listingReportInput.safeParse({ jobId: uuid, reason: "other", details }).success, true);
});

test("export: storage paths never leave the server", () => {
  const rows = stripInternal([{ id: 1, label: "CV", storage_path: "u/secret.pdf" }]);
  assert.deepEqual(rows, [{ id: 1, label: "CV" }]);
  const s = section({ data: [{ id: 2, storage_path: "x" }], error: null });
  assert.deepEqual(s, { rows: [{ id: 2 }] });
});

test("export: a failing table is marked unavailable instead of breaking the file", () => {
  assert.deepEqual(section({ data: null, error: { code: "42P01" } }), { unavailable: true });
  const out = shapeExport({
    role: "student",
    generatedAt: new Date("2026-11-15T10:00:00Z"),
    account: { id: uuid, email: "a@b.co" },
    sections: { profile: { rows: [{ id: uuid }] }, settings: { unavailable: true } },
  });
  assert.equal(out.generated_at, "2026-11-15T10:00:00.000Z");
  assert.deepEqual(out.data, { profile: [{ id: uuid }], settings: { unavailable: true } });
  assert.match(out.note, /Resume files are not included/);
});

test("export: employer note explains that candidates' data is excluded; file name is dated", () => {
  const out = shapeExport({ role: "employer", generatedAt: new Date("2026-11-15T10:00:00Z"), account: { id: uuid, email: "e@b.co" }, sections: {} });
  assert.match(out.note, /candidates/);
  assert.equal(exportFileName("employer", new Date("2026-11-15T10:00:00Z")), "studojob-employer-data-2026-11-15.json");
});
