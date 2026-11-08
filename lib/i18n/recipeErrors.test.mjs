import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import { RECIPE_ERROR_KEYS, translateRecipeError } from "./apiErrors.ts";

const en = JSON.parse(await readFile(new URL("./locales/en.json", import.meta.url), "utf8"));
const nb = JSON.parse(await readFile(new URL("./locales/nb.json", import.meta.url), "utf8"));

test("recipe creation, edit, deletion and sharing error keys are covered", async () => {
  for (const [file, expected] of [
    ["app/api/recipes/update/route.ts", ["error"]],
    ["app/api/recipes/[id]/route.ts", ["error"]],
    ["app/api/recipes/delete/route.ts", ["error"]],
    ["app/api/recipes/fork/route.ts", ["error"]],
    ["app/api/public-recipes/[id]/route.ts", ["error"]],
    ["app/api/public-recipes/[id]/start/route.ts", ["error"]],
    ["app/my-recipes/actions/createRecipe.ts", ["error"]],
  ]) {
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
    const errors = new Set();
    function visit(node) {
      if (ts.isPropertyAssignment(node) && expected.includes(node.name.getText(source)) && ts.isStringLiteral(node.initializer)) {
        errors.add(node.initializer.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(errors.size > 0, file);
    for (const error of errors) assert.ok(Object.hasOwn(RECIPE_ERROR_KEYS, error), `${file}: ${error}`);
  }
  for (const key of [...Object.values(RECIPE_ERROR_KEYS), "Invalid {field} data.", "Invalid {field} value."]) {
    assert.ok(Object.hasOwn(en, key), `en: ${key}`);
    assert.ok(Object.hasOwn(nb, key), `nb: ${key}`);
  }
});

test("recipe errors translate known messages and preserve unknown diagnostics", () => {
  const norwegian = (key) => nb[key];
  const english = (key) => en[key];
  assert.equal(translateRecipeError("Ikke innlogget", norwegian), "Innlogging kreves");
  assert.equal(translateRecipeError("Ikke innlogget", english), "Authentication required");
  assert.equal(translateRecipeError("This recipe does not match the batch type.", norwegian), "Oppskriften passer ikke til batchtypen.");
  assert.equal(translateRecipeError("Invalid dry_hops data.", norwegian), "Ugyldige data for «dry_hops».");
  assert.equal(translateRecipeError("Invalid boil_volume value.", norwegian), "Ugyldig verdi for «boil_volume».");
  assert.equal(translateRecipeError("Free accounts can save up to 20 recipes. Delete a recipe or upgrade to Premium to save more.", norwegian), "Gratis kontoer kan lagre opptil 20 oppskrifter. Slett en oppskrift eller oppgrader til Premium for å lagre flere.");
  assert.equal(translateRecipeError("Unexpected diagnostic", norwegian), "Unexpected diagnostic");
  assert.equal(translateRecipeError("Invalid unknown value.", norwegian), "Invalid unknown value.");
});

test("recipe edit validation translates all supported field errors", () => {
  const t = (key) => nb[key];
  for (const field of ["malts", "hops", "dry_hops", "fruits", "ingredients", "steps"]) {
    assert.equal(translateRecipeError(`Invalid ${field} data.`, t), `Ugyldige data for «${field}».`);
  }
  for (const field of ["og", "fg", "abv", "volume", "boil_volume", "ibu", "ebc", "boil_time", "honey_amount", "base_liquid_amount", "sugar_amount"]) {
    assert.equal(translateRecipeError(`Invalid ${field} value.`, t), `Ugyldig verdi for «${field}».`);
  }
});
