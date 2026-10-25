import assert from "node:assert/strict";
import { test } from "node:test";
import { hasPermission, normalizeMembershipRole } from "./permissions.ts";

test("members cannot view community analytics", () => {
  assert.equal(hasPermission("member", "view_analytics"), false);
  assert.equal(hasPermission("moderator", "view_analytics"), false);
  assert.equal(hasPermission("admin", "view_analytics"), true);
});

test("moderators can issue community actions without account administration access", () => {
  assert.equal(hasPermission("moderator", "review_reports"), true);
  assert.equal(hasPermission("moderator", "moderate_community_members"), true);
  assert.equal(hasPermission("moderator", "manage_users"), false);
  assert.equal(hasPermission("moderator", "manage_memberships"), false);
  assert.equal(hasPermission("moderator", "assign_roles"), false);
  assert.equal(hasPermission("moderator", "view_analytics"), false);
});

test("unknown membership values do not grant admin permissions", () => {
  const role = normalizeMembershipRole("unexpected");

  assert.equal(role, "member");
  assert.equal(hasPermission(role, "view_analytics"), false);
});
