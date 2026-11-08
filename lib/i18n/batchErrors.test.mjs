import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import {
  BATCH_INSIGHTS_ERROR_KEYS,
  BATCH_MOVE_ERROR_KEYS,
  BATCH_OUTCOME_SHARING_ERROR_KEYS,
  BATCH_RECIPE_LINK_ERROR_KEYS,
  BATCH_REMINDER_ERROR_KEYS,
  BATCH_UPDATE_ERROR_KEYS,
  BOTTLE_AGING_ERROR_KEYS,
  BREW_DAY_CHECKLIST_ERROR_KEYS,
  CONDITIONING_ENTRY_ERROR_KEYS,
  SPLIT_BATCH_ERROR_KEYS,
  VESSEL_VISIBILITY_ERROR_KEYS,
  VESSEL_CONTRIBUTOR_ERROR_KEYS,
  translateBatchError,
  translateGeneratedGravityReminder,
  translateVesselVisibilityError,
} from "./apiErrors.ts";

const en = JSON.parse(await readFile(new URL("./locales/en.json", import.meta.url), "utf8"));
const nb = JSON.parse(await readFile(new URL("./locales/nb.json", import.meta.url), "utf8"));

test("batch, checklist, contributor, and vessel visibility errors are covered by both locales", async () => {
  const routeFiles = [
    ["app/api/batch-reminders/route.ts", ["error"], BATCH_REMINDER_ERROR_KEYS],
    ["app/api/batches/[id]/brew-day-checklist/route.ts", ["error"], BREW_DAY_CHECKLIST_ERROR_KEYS],
    ["app/api/batches/[id]/insights/route.ts", ["error"], BATCH_INSIGHTS_ERROR_KEYS],
    ["app/api/batches/move/route.ts", ["error"], BATCH_MOVE_ERROR_KEYS],
    ["app/api/batches/[id]/recipe/route.ts", ["error"], BATCH_RECIPE_LINK_ERROR_KEYS],
    ["app/api/batches/[id]/sharing/route.ts", ["error"], BATCH_OUTCOME_SHARING_ERROR_KEYS],
    ["app/api/kar/[id]/contributors/route.ts", ["error", "activityWarning"], VESSEL_CONTRIBUTOR_ERROR_KEYS],
    ["app/api/kar/visibility/route.ts", ["error"], VESSEL_VISIBILITY_ERROR_KEYS],
    ["app/api/batches/[id]/split/route.ts", ["error"], SPLIT_BATCH_ERROR_KEYS],
    ["app/api/batches/[id]/aging/route.ts", ["error"], BOTTLE_AGING_ERROR_KEYS],
  ];

  for (const [file, properties, errorKeys] of routeFiles) {
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
    const errors = new Set();
    function collectStrings(node) {
      if (ts.isStringLiteral(node)) errors.add(node.text);
      ts.forEachChild(node, collectStrings);
    }
    function visit(node) {
      if (ts.isPropertyAssignment(node) && properties.includes(node.name.getText(source))) {
        collectStrings(node.initializer);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(errors.size > 0, file);
    for (const error of errors) {
      assert.ok(Object.hasOwn(errorKeys, error), `${file}: ${error}`);
    }
  }

  const splitSource = await readFile("app/api/batches/[id]/split/route.ts", "utf8");
  assert.ok(splitSource.includes("const knownErrors:"));
  for (const key of Object.keys(SPLIT_BATCH_ERROR_KEYS)) {
    assert.ok(splitSource.includes(key), `split route: ${key}`);
  }

  const checklistSource = ts.createSourceFile(
    "lib/brewing/brewDayChecklist.ts",
    await readFile("lib/brewing/brewDayChecklist.ts", "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
  const parseErrors = new Set();
  function visitChecklist(node) {
    if (
      ts.isNewExpression(node) &&
      node.expression.getText(checklistSource) === "Error" &&
      node.arguments?.[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      parseErrors.add(node.arguments[0].text);
    }
    ts.forEachChild(node, visitChecklist);
  }
  visitChecklist(checklistSource);
  for (const error of parseErrors) {
    assert.ok(Object.hasOwn(BREW_DAY_CHECKLIST_ERROR_KEYS, error), error);
  }

  const conditioningSource = ts.createSourceFile(
    "app/kar/[id]/actions.ts",
    await readFile("app/kar/[id]/actions.ts", "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
  const conditioningErrors = new Set();
  function visitConditioning(node) {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name?.text === "addConditioningEntry"
    ) {
      function visitFunction(functionNode) {
        if (
          ts.isNewExpression(functionNode) &&
          functionNode.expression.getText(conditioningSource) === "Error" &&
          functionNode.arguments?.[0] &&
          ts.isStringLiteral(functionNode.arguments[0])
        ) {
          conditioningErrors.add(functionNode.arguments[0].text);
        }
        ts.forEachChild(functionNode, visitFunction);
      }
      visitFunction(node);
      return;
    }
    ts.forEachChild(node, visitConditioning);
  }
  visitConditioning(conditioningSource);
  for (const error of conditioningErrors) {
    assert.ok(Object.hasOwn(CONDITIONING_ENTRY_ERROR_KEYS, error), `conditioning action: ${error}`);
  }

  const actionSource = ts.createSourceFile(
    "app/kar/[id]/actions.ts",
    await readFile("app/kar/[id]/actions.ts", "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
  const batchUpdateErrors = new Set();
  function collectBatchUpdateErrors(node) {
    if (
      ts.isNewExpression(node) &&
      node.expression.getText(actionSource) === "Error" &&
      node.arguments?.[0]
    ) {
      const error = node.arguments[0];
      if (ts.isStringLiteral(error)) {
        batchUpdateErrors.add(error.text);
      } else if (ts.isTemplateExpression(error)) {
        const fieldTemplate = error.templateSpans.some(
          (span) => ts.isIdentifier(span.expression) && span.expression.text === "field"
        );
        const placeholder = fieldTemplate ? "{field}" : "{details}";
        const tail = error.templateSpans.map((span) => span.literal.text).join("");
        batchUpdateErrors.add(`${error.head.text}${placeholder}${tail}`);
      }
    }
    ts.forEachChild(node, collectBatchUpdateErrors);
  }
  function visitBatchUpdateFunctions(node) {
    if (
      ts.isFunctionDeclaration(node) &&
      ["parseJsonArray", "updateBatch"].includes(node.name?.text ?? "")
    ) {
      collectBatchUpdateErrors(node);
      return;
    }
    ts.forEachChild(node, visitBatchUpdateFunctions);
  }
  visitBatchUpdateFunctions(actionSource);
  for (const error of batchUpdateErrors) {
    assert.ok(Object.hasOwn(BATCH_UPDATE_ERROR_KEYS, error), `batch update action: ${error}`);
  }

  for (const mapping of [
    BATCH_REMINDER_ERROR_KEYS,
    BATCH_UPDATE_ERROR_KEYS,
    BREW_DAY_CHECKLIST_ERROR_KEYS,
    VESSEL_CONTRIBUTOR_ERROR_KEYS,
    SPLIT_BATCH_ERROR_KEYS,
    CONDITIONING_ENTRY_ERROR_KEYS,
    BOTTLE_AGING_ERROR_KEYS,
    BATCH_INSIGHTS_ERROR_KEYS,
    BATCH_MOVE_ERROR_KEYS,
    BATCH_RECIPE_LINK_ERROR_KEYS,
    BATCH_OUTCOME_SHARING_ERROR_KEYS,
    VESSEL_VISIBILITY_ERROR_KEYS,
  ]) {
    for (const key of Object.values(mapping)) {
      assert.ok(Object.hasOwn(en, key), `en: ${key}`);
      assert.ok(Object.hasOwn(nb, key), `nb: ${key}`);
    }
  }
});

test("vessel visibility errors translate while unknown diagnostics remain visible", () => {
  const t = (key) => nb[key];
  assert.equal(translateVesselVisibilityError("Not authenticated", t), "Du er ikke logget inn.");
  assert.equal(
    translateVesselVisibilityError("Could not update vessel visibility. Please try again.", t),
    "Kunne ikke oppdatere synligheten for gjæringskaret. Prøv igjen."
  );
  assert.equal(translateVesselVisibilityError("Unknown database diagnostic", t), "Unknown database diagnostic");
});

test("batch API errors and generated gravity reminders translate without changing user reminders", () => {
  const t = (key) => nb[key];
  assert.equal(translateBatchError("Reminder not found", t), "Fant ikke påminnelsen");
  assert.equal(translateBatchError("Could not load batch insights", t), "Kunne ikke laste inn partiinnsikt");
  assert.equal(translateBatchError("The batch is no longer in that vessel.", t), "Partiet er ikke lenger i dette gjæringskaret.");
  assert.equal(translateBatchError("Could not link the selected recipe to this batch", t), "Kunne ikke koble den valgte oppskriften til dette partiet.");
  assert.equal(
    translateBatchError("Apply the batch lifecycle migration to view batch insights.", t),
    "Kjør databasemigreringen for partiets livssyklus for å vise partiinnsikt."
  );
  assert.equal(translateBatchError("Enter a valid tasting date and reminder time.", t), "Oppgi en gyldig smaksdato og et gyldig tidspunkt for påminnelsen.");
  assert.equal(translateBatchError("Each portion must go into a different vessel.", t), "Hver del må overføres til et eget kar.");
  assert.equal(
    translateBatchError("Could not save conditioning entry: relation missing", t),
    "Kunne ikke lagre modningsoppføringen: relation missing"
  );
  assert.equal(translateBatchError("Unrecognized database diagnostic", t), "Unrecognized database diagnostic");
  assert.equal(
    translateGeneratedGravityReminder(
      'No gravity reading has been logged for "My batch" during primary fermentation in 7 days. Consider taking a gravity reading.',
      t
    ),
    "Det er ikke registrert noen SG-måling for «My batch» under primærgjæring de siste 7 dagene. Vurder å måle SG-en."
  );
  assert.equal(translateBatchError("Invalid dry_hops_json batch data.", t), "Ugyldige data for dry_hops_json i partiet.");
  assert.equal(translateGeneratedGravityReminder("My personal reminder", t), "My personal reminder");
});
