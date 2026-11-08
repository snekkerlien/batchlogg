import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import {
  BREWING_PROFILE_ERROR_KEYS,
  translateBrewingProfileError,
} from "./apiErrors.ts";

const en = JSON.parse(await readFile(new URL("./locales/en.json", import.meta.url), "utf8"));
const nb = JSON.parse(await readFile(new URL("./locales/nb.json", import.meta.url), "utf8"));

test("water and equipment profile route and client errors have translations", async () => {
  const files = [
    "app/api/water-chemistry-profiles/route.ts",
    "app/api/equipment-profiles/route.ts",
    "app/abv-tools/WaterChemistryCalculator.tsx",
    "app/abv-tools/BrewDayWaterCalculator.tsx",
  ];

  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      await readFile(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const errors = new Set();
    function collectStrings(node) {
      if (ts.isStringLiteral(node)) errors.add(node.text);
      ts.forEachChild(node, collectStrings);
    }
    function visit(node) {
      if (ts.isPropertyAssignment(node) && node.name.getText(source) === "error") {
        collectStrings(node.initializer);
      }
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "Error"
      ) {
        for (const argument of node.arguments ?? []) collectStrings(argument);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    for (const error of errors) {
      if (error === "23505") continue;
      assert.ok(Object.hasOwn(BREWING_PROFILE_ERROR_KEYS, error), `${file}: ${error}`);
    }
  }

  for (const key of Object.values(BREWING_PROFILE_ERROR_KEYS)) {
    assert.ok(Object.hasOwn(en, key), `en: ${key}`);
    assert.ok(Object.hasOwn(nb, key), `nb: ${key}`);
  }
});

test("profile errors translate known messages and preserve unknown diagnostics", () => {
  const t = (key) => nb[key];
  assert.equal(
    translateBrewingProfileError("Could not save water chemistry profile.", t),
    "Kunne ikke lagre vannkjemiprofilen."
  );
  assert.equal(
    translateBrewingProfileError("Unrecognized database diagnostic", t),
    "Unrecognized database diagnostic"
  );
});
