import assert from "node:assert/strict";
import { test } from "node:test";
import { getRoadmapReturnPath } from "./roadmapNavigation.ts";

test("roadmap return paths only allow known admin pages", () => {
  assert.equal(getRoadmapReturnPath("/admin"), "/admin");
  assert.equal(getRoadmapReturnPath("/admin/feedback"), "/admin/feedback");
  assert.equal(getRoadmapReturnPath("https://example.com"), "/admin");
  assert.equal(getRoadmapReturnPath("//example.com"), "/admin");
  assert.equal(getRoadmapReturnPath(null), "/admin");
});
