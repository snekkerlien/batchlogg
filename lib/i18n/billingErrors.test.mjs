import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import { BILLING_ERROR_KEYS, translateBillingError } from "./apiErrors.ts";

const en = JSON.parse(await readFile(new URL("./locales/en.json", import.meta.url), "utf8"));
const nb = JSON.parse(await readFile(new URL("./locales/nb.json", import.meta.url), "utf8"));

test("user-facing billing route errors have translations", async () => {
  for (const file of [
    "app/api/billing/checkout/route.ts",
    "app/api/billing/portal/route.ts",
    "app/api/billing/cancel/route.ts",
  ]) {
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
    const errors = new Set();
    function collectStrings(node) {
      if (ts.isStringLiteral(node)) errors.add(node.text);
      ts.forEachChild(node, collectStrings);
    }
    function visit(node) {
      if (
        ts.isPropertyAssignment(node) &&
        node.name.getText(source) === "error"
      ) {
        collectStrings(node.initializer);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(errors.size > 0, file);
    for (const error of errors) assert.ok(Object.hasOwn(BILLING_ERROR_KEYS, error), `${file}: ${error}`);
  }

  for (const key of Object.values(BILLING_ERROR_KEYS)) {
    assert.ok(Object.hasOwn(en, key), `en: ${key}`);
    assert.ok(Object.hasOwn(nb, key), `nb: ${key}`);
  }
});

test("billing errors translate known messages and preserve unknown diagnostics", () => {
  const t = (key) => nb[key];
  assert.equal(translateBillingError("There is no active subscription to cancel", t), "Det finnes ikke noe aktivt abonnement å si opp");
  assert.equal(translateBillingError("Unexpected Stripe response", t), "Unexpected Stripe response");
});
