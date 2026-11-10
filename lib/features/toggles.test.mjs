import assert from "node:assert/strict";
import { test } from "node:test";
import { getAllFeatureToggles, updateFeatureToggle } from "./toggles.ts";

function mockClient({ updateError = null, auditError = null, data = { key: "business-accounts", enabled: true } } = {}) {
  const calls = [];
  return {
    calls,
    client: {
      from(table) {
        return {
          update(values) {
            calls.push({ table, values });
            return {
              eq(column, value) {
                calls.push({ column, value });
                return { select: () => ({ maybeSingle: async () => ({ data, error: updateError }) }) };
              },
            };
          },
          async insert(values) {
            calls.push({ table, values });
            return { error: auditError };
          },
          select() {
            return { order: async () => ({ data: null, error: updateError }) };
          },
        };
      },
    },
  };
}

test("updates a toggle and records the developer in both tables", async () => {
  const { client, calls } = mockClient();
  const result = await updateFeatureToggle(client, "business-accounts", true, "developer-id");
  assert.equal(result.toggle.enabled, true);
  assert.equal(result.auditError, false);
  assert.equal(calls[0].values.updated_by, "developer-id");
  assert.deepEqual(calls[2], {
    table: "feature_toggles_audit",
    values: { toggle_key: "business-accounts", enabled: true, changed_by: "developer-id" },
  });
});

test("reports a missing toggle instead of claiming success", async () => {
  const { client, calls } = mockClient({ data: null });
  await assert.rejects(updateFeatureToggle(client, "business-accounts", true, "developer-id"), /not found/);
  assert.equal(calls.length, 2);
});

test("reports update failures without attempting an audit write", async () => {
  const { client, calls } = mockClient({ updateError: { message: "update rejected" } });
  await assert.rejects(updateFeatureToggle(client, "business-accounts", true, "developer-id"), /Could not update/);
  assert.equal(calls.length, 2);
});

test("reports audit failures even when the update succeeds", async () => {
  const { client } = mockClient({ auditError: { message: "audit unavailable" } });
  const result = await updateFeatureToggle(client, "business-accounts", true, "developer-id");
  assert.equal(result.toggle.enabled, true);
  assert.equal(result.auditError, true);
});

test("reports database failures when loading toggles", async () => {
  const { client } = mockClient({ updateError: { message: "database unavailable" } });
  await assert.rejects(getAllFeatureToggles(client), /Could not load/);
});
