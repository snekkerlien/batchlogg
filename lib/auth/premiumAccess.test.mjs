import assert from "node:assert/strict";
import { test } from "node:test";
import { getPremiumAccessSources } from "./permissions.ts";

test("classifies a manual Premium grant", () => {
  assert.deepEqual(
    getPremiumAccessSources({
      account_tier: "premium",
      premium_grant_source: "manual",
      membership_status: "member",
    }),
    ["manual"]
  );
});

test("classifies subscription-based Premium access", () => {
  assert.deepEqual(
    getPremiumAccessSources({
      account_tier: "premium",
      premium_grant_source: "stripe",
      membership_status: "member",
    }),
    ["subscription"]
  );
});

test("includes role-based access alongside other grant sources", () => {
  assert.deepEqual(
    getPremiumAccessSources({
      account_tier: "premium",
      premium_grant_source: "manual",
      membership_status: "moderator",
    }),
    ["manual", "role"]
  );
  assert.deepEqual(
    getPremiumAccessSources({
      account_tier: "free",
      premium_grant_source: null,
      membership_status: "founder",
    }),
    ["role"]
  );
});
