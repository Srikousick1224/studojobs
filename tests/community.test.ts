import test from "node:test";
import assert from "node:assert/strict";
import { commentInput, isPostKind, postInput } from "../src/lib/community/schema";

test("post input accepts a valid post and trims", () => {
  const r = postInput.safeParse({ kind: "tip", title: "  Resume tip one  ", body: "Keep it to one page." });
  assert.ok(r.success && r.data.title === "Resume tip one");
});
test("post input rejects short title, short body, bad kind, long body", () => {
  assert.ok(!postInput.safeParse({ kind: "tip", title: "abc", body: "long enough body" }).success);
  assert.ok(!postInput.safeParse({ kind: "tip", title: "Good title", body: "short" }).success);
  assert.ok(!postInput.safeParse({ kind: "admin", title: "Good title", body: "long enough body" }).success);
  assert.ok(!postInput.safeParse({ kind: "tip", title: "Good title", body: "x".repeat(3001) }).success);
});
test("comment input needs a uuid and non-empty body", () => {
  assert.ok(!commentInput.safeParse({ postId: "nope", body: "hi" }).success);
  assert.ok(!commentInput.safeParse({ postId: crypto.randomUUID(), body: "   " }).success);
  assert.ok(commentInput.safeParse({ postId: crypto.randomUUID(), body: "Nice!" }).success);
});
test("isPostKind", () => { assert.ok(isPostKind("win")); assert.ok(!isPostKind("x")); });
