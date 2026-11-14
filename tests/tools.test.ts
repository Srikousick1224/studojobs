import assert from "node:assert/strict";
import { test } from "node:test";
import { checklistProgress, resumeChecklist } from "../src/lib/tools/resume-checklist";
import { pickQuestion, practiceQuestions } from "../src/lib/tools/interview-questions";

test("checklist progress counts only known ids", () => {
  assert.deepEqual(checklistProgress(new Set()), { done: 0, total: resumeChecklist.length, percent: 0 });
  const all = new Set(resumeChecklist.map((i) => i.id));
  assert.equal(checklistProgress(all).percent, 100);
  assert.equal(checklistProgress(new Set(["nope", "one-page"])).done, 1);
});

test("checklist ids are unique", () => {
  assert.equal(new Set(resumeChecklist.map((i) => i.id)).size, resumeChecklist.length);
});

test("pickQuestion avoids repeating and respects topic", () => {
  for (let i = 0; i < 50; i++) {
    const q = pickQuestion("q1", "Teamwork");
    assert.equal(q.kind, "Teamwork");
  }
  for (let i = 0; i < 50; i++) assert.notEqual(pickQuestion("q3", "All").id, "q3");
  assert.ok(practiceQuestions.length >= 10);
});
