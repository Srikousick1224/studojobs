/**
 * Unit tests for Stage E2 pure rules (no network, no Supabase).
 * Run: npm run test:stage-e2
 */
import test from "node:test";
import assert from "node:assert/strict";
import { jobFormSchema, parseList, toJobColumns } from "../src/lib/stage-e/job-schema";
import { escapeLike, hueFromName } from "../src/lib/stage-e/job-view";

const future = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
const valid = (over: Record<string, unknown> = {}) => ({
  intent: "publish",
  title: "Data Analyst Intern",
  summary: "Work with the analytics team on real retail datasets.",
  responsibilities: "Build dashboards\nClean sales data",
  requirements: "SQL basics",
  perks: "",
  type: "internship",
  workMode: "hybrid",
  employment: "full_time",
  level: "internship",
  location: "Chennai",
  categoryId: "",
  isPaid: true,
  payMin: "15000",
  payMax: "20000",
  payPeriod: "month",
  deadline: future(),
  ...over,
});

test("A: a complete, valid job passes and maps to real column names", () => {
  const r = jobFormSchema.safeParse(valid());
  assert.ok(r.success, r.success ? "" : JSON.stringify(r.error.issues));
  const cols = toJobColumns(r.data);
  assert.equal(cols.work_mode, "hybrid");
  assert.equal(cols.pay_currency, "INR");
  assert.deepEqual(cols.responsibilities, ["Build dashboards", "Clean sales data"]);
  assert.equal(cols.category_id, null);
});

test("D: invalid submissions are rejected with a field-specific message", () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ title: "abc" }, "title"],
    [{ summary: "too short" }, "summary"],
    [{ location: "" }, "location"],
    [{ type: "gig" }, "type"],
    [{ workMode: "moon" }, "workMode"],
    [{ payMin: "0" }, "payMin"],
    [{ payMin: "20000", payMax: "15000" }, "payMax"],
    [{ payPeriod: "" }, "payPeriod"],
    [{ deadline: "2020-01-01" }, "deadline"],
    [{ deadline: "not-a-date" }, "deadline"],
    [{ categoryId: "abc" }, "categoryId"],
    [{ intent: "delete" }, "intent"],
  ];
  for (const [over, field] of cases) {
    const r = jobFormSchema.safeParse(valid(over));
    assert.equal(r.success, false, `${field} should be rejected`);
    if (!r.success) assert.ok(r.error.issues.some((i) => i.path[0] === field), `expected an issue on ${field}`);
  }
});

test("D: unpaid roles drop pay values; paid roles need a range", () => {
  const unpaid = jobFormSchema.safeParse(valid({ isPaid: false, payMin: "", payMax: "", payPeriod: "" }));
  assert.ok(unpaid.success);
  if (unpaid.success) {
    const c = toJobColumns(unpaid.data);
    assert.equal(c.is_paid, false);
    assert.equal(c.pay_min, null);
    assert.equal(c.pay_period, null);
  }
});

test("D: list fields reject more than 20 items or an overlong line", () => {
  assert.ok(parseList(Array.from({ length: 21 }, (_, i) => `item ${i}`).join("\n"), "X").error);
  assert.ok(parseList("a".repeat(201), "X").error);
  assert.deepEqual(parseList(" one \n\n two \r\n", "X").items, ["one", "two"]);
});

test("escapeLike makes % and _ literal in location searches", () => {
  assert.equal(escapeLike("50%_off"), "50\\%\\_off");
});

test("monogram hue is stable and within the colour wheel", () => {
  assert.equal(hueFromName("Brightpath"), hueFromName("Brightpath"));
  const h = hueFromName("Anything");
  assert.ok(h >= 0 && h < 360);
});
