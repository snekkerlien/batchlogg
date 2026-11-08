import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import { parseRecipeCsv, recipeCsvRowToInsert } from "../recipes/recipeCsv.ts";
import {
  RECIPE_IMPORT_ERROR_KEYS,
  RECIPE_IMPORT_ERROR_TEMPLATES,
  translateRecipeImportError,
} from "./apiErrors.ts";

const locales = Object.fromEntries(await Promise.all(
  ["en", "nb"].map(async (code) => [
    code,
    JSON.parse(await readFile(new URL(`./locales/${code}.json`, import.meta.url), "utf8")),
  ])
));

test("recipe import fixed errors and templates have translations", async () => {
  for (const [code, messages] of Object.entries(locales)) {
    for (const key of [...Object.values(RECIPE_IMPORT_ERROR_KEYS), ...RECIPE_IMPORT_ERROR_TEMPLATES]) {
      assert.ok(Object.hasOwn(messages, key), `${code}: ${key}`);
    }
  }
  for (const file of ["app/api/recipes/import/route.ts", "lib/recipes/recipeCsv.ts", "lib/recipes/beerFileFormats.ts"]) {
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node) {
      const errorProperty = ts.isPropertyAssignment(node) && node.name.getText(source) === "error";
      const errorConstructor = ts.isNewExpression(node) && node.expression.getText(source) === "Error";
      const value = errorProperty ? node.initializer : errorConstructor ? node.arguments?.[0] : undefined;
      if (value && ts.isStringLiteral(value)) {
        assert.ok(Object.hasOwn(RECIPE_IMPORT_ERROR_KEYS, value.text), `${file}: ${value.text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

test("recipe import translates actual CSV errors and keeps user names intact", () => {
  const cases = [
    [() => parseRecipeCsv(""), "CSV-filen er tom."],
    [() => parseRecipeCsv("name,type\nfoo,Beer"), "CSV-filen mangler den påkrevde kolonnen «volume»."],
    [() => parseRecipeCsv("name,type,volume\nfoo,Beer"), "Rad 2 i CSV-filen har et annet antall kolonner enn overskriftsraden."],
    [() => recipeCsvRowToInsert({ name: "Øl $& {field}", type: "Beer", volume: "bad" }, "user"), "CSV-filen inneholder en ugyldig verdi for «batchvolum»."],
    [() => recipeCsvRowToInsert({ name: "Øl $& {field}", type: "Unknown", volume: "1" }, "user"), "«Øl $& {field}» har en oppskriftstype som ikke støttes."],
    [() => recipeCsvRowToInsert({ name: "Test", type: "Beer", volume: "1", hops: "invalid" }, "user"), "CSV-filen inneholder ugyldig JSON i kolonnen «hops»."],
  ];
  for (const [operation, expected] of cases) {
    let message = "";
    assert.throws(operation, (error) => {
      message = error.message;
      return true;
    });
    assert.equal(translateRecipeImportError(message, (key) => locales.nb[key]), expected);
    assert.equal(translateRecipeImportError(message, (key) => locales.en[key]), message);
  }
});

test("recipe import translates limit messages but leaves unknown diagnostics unchanged", () => {
  const t = (key) => locales.nb[key];
  assert.equal(translateRecipeImportError("A file can contain at most 25 recipes.", t), "En fil kan inneholde høyst 25 oppskrifter.");
  assert.equal(translateRecipeImportError("Free accounts can save up to 20 recipes. Delete a recipe or upgrade to Premium to save more.", t), "Gratis kontoer kan lagre opptil 20 oppskrifter. Slett en oppskrift eller oppgrader til Premium for å lagre flere.");
  assert.equal(translateRecipeImportError("Unexpected diagnostic", t), "Unexpected diagnostic");
});

test("all parameterized CSV field errors and recipe names are handled", () => {
  const t = (key) => locales.nb[key];
  for (const field of ["volume", "og", "fg", "abv", "ibu", "ebc", "honey_amount", "base_liquid_amount", "sugar_amount", "boil_time", "boil_volume"]) {
    const message = `The CSV contains an invalid ${field} value.`;
    assert.equal(translateRecipeImportError(message, t), `CSV-filen inneholder en ugyldig verdi for «${field}».`);
  }
  for (const field of ["fruits", "malts", "hops", "dry_hops", "ingredients", "steps", "malt_warnings", "notes_log"]) {
    const message = `The CSV contains invalid JSON in the "${field}" column.`;
    assert.equal(translateRecipeImportError(message, t), `CSV-filen inneholder ugyldig JSON i kolonnen «${field}».`);
  }
  assert.equal(translateRecipeImportError('"Min $& oppskrift" has an invalid batch volume.', t), "«Min $& oppskrift» har et ugyldig batchvolum.");
});
