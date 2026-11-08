import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import {
  BUSINESS_MANAGEMENT_ERROR_KEYS,
  BREWERY_ANALYTICS_ERROR_KEYS,
  BREWERY_PRODUCT_ERROR_KEYS,
  translateBusinessManagementError,
  translateBreweryAnalyticsError,
  translateBreweryProductError,
} from "./apiErrors.ts";

const en = JSON.parse(await readFile(new URL("./locales/en.json", import.meta.url), "utf8"));
const nb = JSON.parse(await readFile(new URL("./locales/nb.json", import.meta.url), "utf8"));

test("business management and team route errors have translations", async () => {
  const routeFiles = [
    "app/api/brewery/apply/route.ts",
    "app/api/brewery/me/route.ts",
    "app/api/brewery/context/route.ts",
    "app/api/brewery/account/route.ts",
    "app/api/brewery/team/route.ts",
    "app/api/brewery/team/[userId]/route.ts",
    "app/api/brewery/billing/checkout/route.ts",
    "app/api/brewery/billing/portal/route.ts",
  ];

  for (const file of routeFiles) {
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
    const errors = new Set();
    function collectStrings(node) {
      if (ts.isStringLiteral(node)) errors.add(node.text);
      ts.forEachChild(node, collectStrings);
    }
    function visit(node) {
      if (
        ts.isPropertyAssignment(node) &&
        ["error", "cleanupWarning"].includes(node.name.getText(source))
      ) {
        collectStrings(node.initializer);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(errors.size > 0, file);
    for (const error of errors) {
      assert.ok(Object.hasOwn(BUSINESS_MANAGEMENT_ERROR_KEYS, error), `${file}: ${error}`);
    }
  }

  for (const key of Object.values(BUSINESS_MANAGEMENT_ERROR_KEYS)) {
    assert.ok(Object.hasOwn(en, key), `en: ${key}`);
    assert.ok(Object.hasOwn(nb, key), `nb: ${key}`);
  }

  const analyticsRoute = "app/api/brewery/analytics/summary/route.ts";
  const analyticsSource = ts.createSourceFile(
    analyticsRoute,
    await readFile(analyticsRoute, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
  const analyticsErrors = new Set();
  function collectAnalyticsErrors(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(analyticsSource) === "error") {
      function collectStrings(value) {
        if (ts.isStringLiteral(value)) analyticsErrors.add(value.text);
        ts.forEachChild(value, collectStrings);
      }
      collectStrings(node.initializer);
    }
    ts.forEachChild(node, collectAnalyticsErrors);
  }
  collectAnalyticsErrors(analyticsSource);
  for (const error of analyticsErrors) {
    assert.ok(Object.hasOwn(BREWERY_ANALYTICS_ERROR_KEYS, error), `${analyticsRoute}: ${error}`);
  }
  for (const key of Object.values(BREWERY_ANALYTICS_ERROR_KEYS)) {
    assert.ok(Object.hasOwn(en, key), `en: ${key}`);
    assert.ok(Object.hasOwn(nb, key), `nb: ${key}`);
  }
});

test("business errors translate known messages and preserve unknown diagnostics", () => {
  const t = (key) => nb[key];
  assert.equal(
    translateBusinessManagementError("Choose a valid team role.", t),
    "Velg en gyldig teamrolle."
  );
  assert.equal(
    translateBusinessManagementError("Unrecognized database diagnostic", t),
    "Unrecognized database diagnostic"
  );
  assert.equal(
    translateBreweryAnalyticsError("Only owners, managers, and editors can view analytics.", t),
    "Bare eiere, ledere og redaktører kan se analyser."
  );
});

test("brewery product and review API errors have translations", async () => {
  const routeFiles = [
    "app/api/brewery/products/route.ts",
    "app/api/brewery/products/[id]/route.ts",
    "app/api/brewery/products/detect-price/route.ts",
    "app/api/brewery/products/[id]/reviews/route.ts",
    "app/api/brewery/reviews/[id]/report/route.ts",
    "app/api/brewery/reviews/[id]/helpful/route.ts",
    "lib/brewery/product-request.ts",
    "lib/brewery/detect-product-price.ts",
  ];

  for (const file of routeFiles) {
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
      if (
        file.endsWith("detect-product-price.ts") &&
        ts.isNewExpression(node) &&
        node.expression.getText(source) === "Error"
      ) {
        for (const argument of node.arguments ?? []) collectStrings(argument);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(errors.size > 0, file);
    for (const error of errors) {
      assert.ok(
        Object.hasOwn(BREWERY_PRODUCT_ERROR_KEYS, error) ||
          Object.hasOwn(BUSINESS_MANAGEMENT_ERROR_KEYS, error),
        `${file}: ${error}`
      );
    }
  }

  for (const key of Object.values(BREWERY_PRODUCT_ERROR_KEYS)) {
    assert.ok(Object.hasOwn(en, key), `en: ${key}`);
    assert.ok(Object.hasOwn(nb, key), `nb: ${key}`);
  }
});

test("brewery product errors translate known messages and preserve unknown diagnostics", () => {
  const t = (key) => nb[key];
  assert.equal(
    translateBreweryProductError("A product with that URL already exists.", t),
    "Et produkt med denne nettadressen finnes allerede."
  );
  assert.equal(
    translateBreweryProductError("Unexpected database diagnostic", t),
    "Unexpected database diagnostic"
  );
});
