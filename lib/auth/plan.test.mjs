import assert from "node:assert/strict";
import { test } from "node:test";
import { hasPremiumEntitlement } from "./permissions.ts";

test("admin and moderator roles include Premium access", () => {
  assert.equal(hasPremiumEntitlement("free", "admin"), true);
  assert.equal(hasPremiumEntitlement("free", "moderator"), true);
});

test("sponsor, partner, and founder statuses include Premium access", () => {
  assert.equal(hasPremiumEntitlement("free", "sponsor"), true);
  assert.equal(hasPremiumEntitlement("free", "partner"), true);
  assert.equal(hasPremiumEntitlement("free", "founder"), true);
});

test("Premium access still follows the paid plan for members", () => {
  assert.equal(hasPremiumEntitlement("premium", "member"), true);
  assert.equal(hasPremiumEntitlement("free", "member"), false);
});

test("unknown membership roles do not grant Premium access", () => {
  assert.equal(hasPremiumEntitlement("free", "unexpected"), false);
});
