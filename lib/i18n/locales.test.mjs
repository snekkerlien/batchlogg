import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { SITE_LANGUAGES } from "./language.ts";
import { BREWERY_PRODUCT_CATEGORIES } from "../brewery/productCategories.ts";
import { INVENTORY_CATEGORIES, INVENTORY_BOTTLE_TYPES, SNUS_CATEGORIES } from "../inventory/categories.ts";
import { FORUM_CATEGORIES } from "../community/forumContent.ts";
import { WATER_ION_LABELS, WATER_TARGET_PROFILES } from "../brewing/waterChemistry.ts";
import { motdList } from "../motd/motdList.ts";
import { RECIPE_TYPES, isKnownRecipeType } from "../recipes/recipeTypes.ts";
import { INVENTORY_HISTORY_ERROR_KEYS, LEARNING_PROGRESS_ERROR_KEYS, SHOPPING_LIST_ERROR_KEYS, translateApiError } from "./apiErrors.ts";

const localeDirectory = new URL("./locales/", import.meta.url);
const localeSources = Object.fromEntries(
  await Promise.all(SITE_LANGUAGES.map(async ({ code }) => [
    code,
    await readFile(new URL(`${code}.json`, localeDirectory), "utf8"),
  ]))
);
const locales = Object.fromEntries(
  Object.entries(localeSources).map(([code, source]) => [code, JSON.parse(source)])
);
const english = locales.en;

test("locale files do not contain duplicate keys", () => {
  for (const [code, text] of Object.entries(localeSources)) {
    const source = ts.parseJsonText(`${code}.json`, text);
    const object = source.statements[0]?.expression;
    assert.ok(object && ts.isObjectLiteralExpression(object), code);
    const seen = new Set();
    for (const property of object.properties) {
      assert.ok(ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name), code);
      const key = property.name.text;
      assert.ok(!seen.has(key), `${code}: duplicate key ${JSON.stringify(key)}`);
      seen.add(key);
    }
  }
});

test("locale files contain the same nonempty messages and placeholders", () => {
  for (const [code, messages] of Object.entries(locales)) {
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(english).sort(), code);
    for (const [key, source] of Object.entries(english)) {
      const translation = messages[key];
      assert.equal(typeof source, "string", key);
      assert.equal(typeof translation, "string", `${code}: ${key}`);
      assert.ok(source.trim(), key);
      assert.ok(translation.trim(), `${code}: ${key}`);
      const placeholders = (value) =>
        [...value.matchAll(/\{[a-zA-Z]\w*\}/g)].map((match) => match[0]).sort();
      assert.deepEqual(placeholders(translation), placeholders(source), `${code}: ${key}`);
    }
  }
});

test("public recipe filters use natural Norwegian terminology", () => {
  assert.equal(locales.nb["Minimum ABV"], "Laveste ABV");
  assert.equal(locales.nb.Hint, "Tips");
});

test("Norwegian batch terminology preserves brewing and gravity terms", () => {
  const nb = locales.nb;
  assert.equal(nb.Batch, "Parti");
  assert.equal(nb["Batch Ten"], "Ti partier");
  assert.equal(nb["Batch history"], "Partihistorikk");
  assert.equal(nb["Batch name"], "Partiets navn");
  assert.equal(nb["Brew and log {count} batches in Batchlogg."], "Brygg og loggfør {count} partier i Batchlogg.");
  assert.equal(
    nb["Open a vessel to view its batch, or start a brew in an empty one."],
    "Åpne et kar for å se partiet, eller start et brygg i et tomt kar."
  );
  assert.equal(nb["What is the purpose of sparge water in a typical batch-sparge process?"], "Hva er hensikten med skyllevannet ved vanlig satsvis skylling?");
  assert.ok(Object.values(nb).every((value) => !/egenvekt/i.test(value)));
});

test("profile achievement names, categories and instructions have translations", async () => {
  const keys = new Set(["Batches brewed", "Recipes created", "Public recipes", "Forum posts", "Ratings given"]);
  for (const [file, declarations] of [
    [path.join("app", "components", "ProfileOverview.tsx"), ["CATEGORIES", "HOW_TO"]],
    [path.join("lib", "community", "achievementTiers.ts"), ["COMMUNITY_ACHIEVEMENT_TIERS", "RATING_ACHIEVEMENT_TIERS"]],
  ]) {
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function collect(node) {
      if (ts.isArrayLiteralExpression(node) && node.elements.length === 2) {
        const [first, second] = node.elements;
        if (ts.isStringLiteral(first) && ts.isNumericLiteral(second)) keys.add(first.text);
        if (ts.isStringLiteral(first) && ts.isStringLiteral(second)) {
          keys.add(first.text);
          keys.add(second.text);
        }
      }
      if (ts.isPropertyAssignment(node) && node.name.getText(source) === "name" && ts.isStringLiteral(node.initializer)) {
        keys.add(node.initializer.text);
      }
      ts.forEachChild(node, collect);
    }
    function visit(node) {
      if (ts.isVariableDeclaration(node) && declarations.includes(node.name.getText(source)) && node.initializer) {
        collect(node.initializer);
      } else {
        ts.forEachChild(node, visit);
      }
    }
    visit(source);
  }
  for (const [code, messages] of Object.entries(locales)) {
    for (const key of keys) assert.ok(Object.hasOwn(messages, key), `${code}: ${key}`);
  }
  assert.ok(keys.size >= 120, "expected the achievement and instruction keys to be collected");
});

test("batch guide and premium feature content has translations", async () => {
  for (const [file, declaration, properties] of [
    [path.join("app", "components", "BatchGuide.tsx"), "milestones", ["label", "caption"]],
    [path.join("app", "components", "BatchGuide.tsx"), "content", ["eyebrow", "title", "description", "heading", "guidance", "takeaway"]],
    [path.join("app", "components", "PremiumWelcome.tsx"), "premiumFeatures", ["label", "title", "description"]],
  ]) {
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let found = false;
    function collect(node) {
      if (ts.isPropertyAssignment(node) && properties.includes(node.name.getText(source)) && ts.isStringLiteral(node.initializer)) {
        for (const [code, messages] of Object.entries(locales)) {
          assert.ok(Object.hasOwn(messages, node.initializer.text), `${code}: ${node.initializer.text}`);
        }
      }
      ts.forEachChild(node, collect);
    }
    function visit(node) {
      if (ts.isVariableDeclaration(node) && node.name.getText(source) === declaration && node.initializer) {
        found = true;
        collect(node.initializer);
      } else {
        ts.forEachChild(node, visit);
      }
    }
    visit(source);
    assert.ok(found, `${file}: ${declaration}`);
  }
});

test("brewery product categories and account labels have translations", () => {
  for (const [code, messages] of Object.entries(locales)) {
    for (const [, label] of BREWERY_PRODUCT_CATEGORIES) {
      assert.ok(Object.hasOwn(messages, label), `${code}: ${label}`);
    }
    for (const key of ["manager", "editor", "pending", "rejected", "suspended", "Owner", "Manager", "Editor", "Team member", "Sponsored access", "Subscription active", "Subscription trial", "Payment past due", "Subscription canceled", "Access active", "No active subscription"]) {
      assert.ok(Object.hasOwn(messages, key), `${code}: ${key}`);
    }
  }
});

test("recipe count variants have translations", () => {
  for (const [code, messages] of Object.entries(locales)) {
    for (const matching of ["", "matching "]) {
      for (const noun of ["recipe", "recipes"]) {
        const key = `Showing {visible} of {total} ${matching}${noun}`;
        assert.ok(Object.hasOwn(messages, key), `${code}: ${key}`);
      }
    }
  }
});

test("known recipe types have translations without changing custom types", () => {
  for (const [code, messages] of Object.entries(locales)) {
    for (const key of RECIPE_TYPES) assert.ok(Object.hasOwn(messages, key), `${code}: ${key}`);
  }
  assert.equal(isKnownRecipeType("Beer"), true);
  assert.equal(isKnownRecipeType("Custom recipe type"), false);
});

test("dashboard messages have translations", () => {
  for (const [code, messages] of Object.entries(locales)) {
    for (const key of motdList) assert.ok(Object.hasOwn(messages, key), `${code}: ${key}`);
  }
});

test("Academy, inventory history and shopping-list API errors have translations and unknown errors stay visible", async () => {
  for (const [file, errorKeys] of [
    [path.join("app", "api", "learning-progress", "route.ts"), LEARNING_PROGRESS_ERROR_KEYS],
    [path.join("app", "api", "inventory", "history", "route.ts"), INVENTORY_HISTORY_ERROR_KEYS],
    [path.join("app", "api", "shopping-list", "route.ts"), SHOPPING_LIST_ERROR_KEYS],
    [path.join("lib", "auth", "plan.ts"), SHOPPING_LIST_ERROR_KEYS],
  ]) {
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
    const apiErrors = new Set();
    function visit(node) {
      if (ts.isPropertyAssignment(node) && node.name.getText(source) === "error" && ts.isStringLiteral(node.initializer)) {
        apiErrors.add(node.initializer.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(apiErrors.size > 0);
    for (const error of apiErrors) assert.ok(Object.hasOwn(errorKeys, error), error);
    for (const [code, messages] of Object.entries(locales)) {
      for (const [error, key] of Object.entries(errorKeys)) {
        assert.ok(Object.hasOwn(messages, key), `${code}: ${key}`);
        assert.equal(translateApiError(error, (value) => messages[value], errorKeys), messages[key]);
      }
      assert.equal(translateApiError("Unexpected diagnostic", (key) => messages[key], errorKeys), "Unexpected diagnostic");
    }
  }
});

test("forum categories, calendar weekdays and water profiles have translations", () => {
  const keys = [
    ...FORUM_CATEGORIES,
    ...Object.values(WATER_ION_LABELS),
    ...Object.keys(WATER_TARGET_PROFILES),
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
  ];
  for (const [code, messages] of Object.entries(locales)) {
    for (const key of keys) assert.ok(Object.hasOwn(messages, key), `${code}: ${key}`);
  }
});

test("calculator labels, descriptions and validation input names have translations", async () => {
  for (const entry of await readdir(path.join("app", "abv-tools"))) {
    if (!entry.endsWith(".tsx")) continue;
    const file = path.join("app", "abv-tools", entry);
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function check(key) {
      for (const [code, messages] of Object.entries(locales)) {
        assert.ok(Object.hasOwn(messages, key), `${file}: ${code}: ${key}`);
      }
    }
    function visit(node) {
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
          ["CalculatorDisclosure", "CalculatorResult"].includes(node.tagName.getText(source))) {
        for (const attribute of node.attributes.properties) {
          if (ts.isJsxAttribute(attribute) && ["name", "title", "description", "assumptions"].includes(attribute.name.getText(source)) &&
              attribute.initializer && ts.isStringLiteral(attribute.initializer)) {
            check(attribute.initializer.text);
          }
        }
      }
      if (ts.isPropertyAssignment(node) && node.name.getText(source) === "label" && ts.isStringLiteral(node.initializer)) {
        check(node.initializer.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

test("water chemistry missing-field and validation labels render in both languages", async () => {
  const file = path.join("app", "abv-tools", "CalculatorResult.tsx");
  const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = source.statements.filter((node) =>
    ts.isFunctionDeclaration(node) && ["translateCalculatorLabel", "translateValidationError"].includes(node.name?.text)
  );
  assert.equal(functions.length, 2);
  const code = ts.transpile(
    `${functions.map((node) => node.getText(source)).join("\n")}\nglobalThis.translations = { translateCalculatorLabel, translateValidationError };`,
    { target: ts.ScriptTarget.ES2022 }
  );
  const context = { WATER_ION_LABELS };
  runInNewContext(code, context);
  for (const [locale, messages] of Object.entries(locales)) {
    const t = (key) => {
      assert.ok(Object.hasOwn(messages, key), `${locale}: ${key}`);
      return messages[key];
    };
    for (const ion of Object.values(WATER_ION_LABELS)) {
      for (const prefix of ["source", "target", "Source", "Target"]) {
        const label = `${prefix} ${ion}`;
        assert.ok(context.translations.translateCalculatorLabel(label, t));
        if (locale === "en") assert.equal(context.translations.translateCalculatorLabel(label, t), label);
        assert.ok(context.translations.translateValidationError(`${label} must be at least 0.`, t));
      }
    }
  }
});

test("inventory category, subcategory and status labels have translations", () => {
  const keys = [
    ...INVENTORY_CATEGORIES.flatMap(({ label, subcategories }) => [label, ...subcategories]),
    ...INVENTORY_BOTTLE_TYPES,
    ...SNUS_CATEGORIES,
    "OK", "Empty", "Low", "malt", "hop", "yeast", "item",
  ];
  for (const [code, messages] of Object.entries(locales)) {
    for (const key of keys) assert.ok(Object.hasOwn(messages, key), `${code}: ${key}`);
  }
});

test("literal translation calls have entries in every language file", async () => {
  const missing = [];

  async function visitDirectory(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (directory === "app" && (entry.name === "admin" || entry.name === "api")) continue;
        await visitDirectory(path.join(directory, entry.name));
      } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
        const file = path.join(directory, entry.name);
        const source = ts.createSourceFile(
          file,
          await readFile(file, "utf8"),
          ts.ScriptTarget.Latest,
          true,
          entry.name.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
        );
        function check(key) {
          for (const [code, messages] of Object.entries(locales)) {
            if (!Object.hasOwn(messages, key)) {
              missing.push(`${file}: ${code}: ${JSON.stringify(key)}`);
            }
          }
        }
        function checkArgument(argument) {
          if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
            check(argument.text);
          } else if (ts.isConditionalExpression(argument)) {
            checkArgument(argument.whenTrue);
            checkArgument(argument.whenFalse);
          }
        }
        function visit(node) {
          if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === "t" &&
            node.arguments.length === 1
          ) {
            checkArgument(node.arguments[0]);
          }
          if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "TranslatedText") {
            for (const attribute of node.attributes.properties) {
              if (
                ts.isJsxAttribute(attribute) &&
                attribute.name.getText(source) === "text" &&
                attribute.initializer &&
                ts.isStringLiteral(attribute.initializer)
              ) {
                check(attribute.initializer.text);
              } else if (
                ts.isJsxAttribute(attribute) &&
                attribute.name.getText(source) === "text" &&
                attribute.initializer &&
                ts.isJsxExpression(attribute.initializer) &&
                attribute.initializer.expression
              ) {
                checkArgument(attribute.initializer.expression);
              }
            }
          }
          if (
            file.endsWith(path.join("brew-insights", "[batchId]", "page.tsx")) &&
            ts.isJsxSelfClosingElement(node) &&
            ["Metric", "TimelineDate", "Comparison", "NoteCard"].includes(node.tagName.getText(source))
          ) {
            for (const attribute of node.attributes.properties) {
              if (
                ts.isJsxAttribute(attribute) &&
                ["label", "title"].includes(attribute.name.getText(source)) &&
                attribute.initializer &&
                ts.isStringLiteral(attribute.initializer)
              ) {
                check(attribute.initializer.text);
              }
            }
          }
          if (
            file.endsWith(path.join("kar", "[id]", "ConditioningLog.tsx")) &&
            ts.isJsxSelfClosingElement(node) &&
            node.tagName.getText(source) === "Field"
          ) {
            for (const attribute of node.attributes.properties) {
              if (
                ts.isJsxAttribute(attribute) &&
                ["label", "placeholder", "help"].includes(attribute.name.getText(source)) &&
                attribute.initializer &&
                ts.isStringLiteral(attribute.initializer)
              ) {
                check(attribute.initializer.text);
              }
            }
          }
          if (
            file.endsWith(path.join("brew-insights", "[batchId]", "page.tsx")) &&
            ts.isVariableDeclaration(node) &&
            ["conditioningEntryLabels", "conditioningDetailLabels"].includes(node.name.getText(source)) &&
            node.initializer &&
            ts.isObjectLiteralExpression(node.initializer)
          ) {
            for (const property of node.initializer.properties) {
              if (ts.isPropertyAssignment(property) && ts.isStringLiteral(property.initializer)) {
                check(property.initializer.text);
              }
            }
          }
          if (
            file.endsWith(path.join("components", "FirstLoginSetup.tsx")) &&
            ts.isCallExpression(node) &&
            node.expression.getText(source) === "setError" &&
            node.arguments[0] &&
            ts.isStringLiteral(node.arguments[0]) &&
            node.arguments[0].text
          ) {
            check(node.arguments[0].text);
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
  }

  await visitDirectory("app");
  assert.deepEqual(missing, []);
});

test("water and equipment profile errors have entries in every language file", async () => {
  const files = [
    path.join("app", "api", "water-chemistry-profiles", "route.ts"),
    path.join("app", "api", "equipment-profiles", "route.ts"),
    path.join("app", "abv-tools", "WaterChemistryCalculator.tsx"),
    path.join("app", "abv-tools", "BrewDayWaterCalculator.tsx"),
  ];
  const keys = new Set();

  function collectStrings(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      keys.add(node.text);
      return;
    }
    if (ts.isConditionalExpression(node)) {
      collectStrings(node.whenTrue);
      collectStrings(node.whenFalse);
    } else if (ts.isBinaryExpression(node)) {
      if (
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      ) {
        collectStrings(node.right);
      }
    } else if (ts.isParenthesizedExpression(node)) {
      collectStrings(node.expression);
    }
  }

  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      await readFile(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
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
  }

  for (const [code, messages] of Object.entries(locales)) {
    for (const key of keys) {
      assert.ok(Object.hasOwn(messages, key), `${code}: ${key}`);
    }
  }
});

test("Academy dynamic interface messages exist in every language", async () => {
  const file = path.join("app", "games", "[game]", "page.tsx");
  const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const keys = new Set();
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) && node.name.getText(source) === "LEARNING_GAMES" &&
      node.initializer && ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const game of node.initializer.properties) {
        assert.ok(ts.isPropertyAssignment(game) && ts.isObjectLiteralExpression(game.initializer));
        for (const property of game.initializer.properties) {
          if (ts.isPropertyAssignment(property) && ["title", "subtitle", "intro"].includes(property.name.getText(source))) {
            assert.ok(ts.isStringLiteral(property.initializer));
            keys.add(property.initializer.text);
          }
        }
      }
    }
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "ariaLabel" && ts.isStringLiteral(node.initializer)) {
      keys.add(node.initializer.text);
    }
    if (
      ts.isCallExpression(node) && node.expression.getText(source) === "setProgressMessage" &&
      node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const property = node.arguments[0].properties.find(
        (item) => ts.isPropertyAssignment(item) && item.name.getText(source) === "key"
      );
      assert.ok(property && ts.isPropertyAssignment(property) && ts.isStringLiteral(property.initializer));
      keys.add(property.initializer.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(keys.size > 0);
  for (const [code, messages] of Object.entries(locales)) {
    for (const key of keys) assert.ok(Object.hasOwn(messages, key), `${code}: ${JSON.stringify(key)}`);
  }
});

test("translated select options preserve their underlying values", async () => {
  const invalid = [];

  async function visitDirectory(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (directory === "app" && (entry.name === "admin" || entry.name === "api")) continue;
        await visitDirectory(path.join(directory, entry.name));
      } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
        const file = path.join(directory, entry.name);
        const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        function visit(node) {
          if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === "option") {
            const hasValue = node.openingElement.attributes.properties.some(
              (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "value"
            );
            const translated = node.children.some(
              (child) => ts.isJsxExpression(child) && child.expression &&
                ts.isCallExpression(child.expression) &&
                ts.isIdentifier(child.expression.expression) &&
                child.expression.expression.text === "t"
            );
            if (translated && !hasValue) {
              const { line } = source.getLineAndCharacterOfPosition(node.getStart());
              invalid.push(`${file}:${line + 1}`);
            }
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
  }

  await visitDirectory("app");
  assert.deepEqual(invalid, []);
});

test("brew-day checklist labels exist in every language", async () => {
  const file = path.join("lib", "brewing", "brewDayChecklist.ts");
  const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
  const missing = [];

  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      ["title", "description"].includes(node.name.getText(source)) &&
      ts.isStringLiteral(node.initializer)
    ) {
      for (const [code, messages] of Object.entries(locales)) {
        if (!Object.hasOwn(messages, node.initializer.text)) {
          missing.push(`${code}: ${JSON.stringify(node.initializer.text)}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.deepEqual(missing, []);
});
