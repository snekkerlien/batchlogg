import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { ACADEMY_MATH_MESSAGES, formatAcademyMathMessage } from "./academyMath.ts";

const page = await readFile(new URL("../../app/games/[game]/page.tsx", import.meta.url), "utf8");
const source = ts.createSourceFile("page.tsx", page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ["createMathPracticeQuestions", "mathQuestionHint", "plainLanguageQuestion"];
const functions = source.statements.filter(
  (statement) => ts.isFunctionDeclaration(statement) && names.includes(statement.name?.text)
);
assert.equal(functions.length, names.length);
const code = ts.transpile(
  `${functions.map((statement) => statement.getText(source)).join("\n")}\n` +
  "globalThis.academy = { createMathPracticeQuestions, mathQuestionHint, plainLanguageQuestion };",
  { target: ts.ScriptTarget.ES2022 }
);
const context = {};
runInNewContext(code, context);
const { createMathPracticeQuestions, mathQuestionHint, plainLanguageQuestion } = context.academy;
const locales = Object.fromEntries(await Promise.all(["en", "nb"].map(async (code) => [
  code,
  JSON.parse(await readFile(new URL(`./locales/${code}.json`, import.meta.url), "utf8")),
])));

test("generated Academy math questions retain their English text and have Norwegian templates", () => {
  for (const units of ["metric", "imperial"]) {
    const questions = createMathPracticeQuestions(units).slice(8);
    assert.equal(questions.length, 92, units);
    const families = new Set();
    for (const [prompt, answer, explanation, , , , , translation] of questions) {
      assert.ok(translation, `${units}: ${prompt}`);
      families.add(translation.family);
      const english = (key) => {
        assert.ok(Object.hasOwn(locales.en, key), key);
        return locales.en[key];
      };
      const norwegian = (key) => {
        assert.ok(Object.hasOwn(locales.nb, key), key);
        return locales.nb[key];
      };
      assert.equal(formatAcademyMathMessage(translation, "prompt", english), plainLanguageQuestion(prompt));
      assert.equal(formatAcademyMathMessage(translation, "explanation", english), explanation);
      for (const part of ["prompt", "explanation"]) {
        const text = formatAcademyMathMessage(translation, part, norwegian);
        assert.doesNotMatch(text, /\{[a-zA-Z]\w*\}/);
        assert.notEqual(text, formatAcademyMathMessage(translation, part, english));
      }
      assert.ok(answer);
      const hint = mathQuestionHint(prompt);
      assert.ok(hint, prompt);
      assert.ok(Object.hasOwn(locales.nb, hint), hint);
    }
    assert.deepEqual([...families].sort(), Object.keys(ACADEMY_MATH_MESSAGES).sort());
  }
});

test("Academy math templates reject missing values", () => {
  assert.throws(
    () => formatAcademyMathMessage({ family: "dilutionVolume", values: {} }, "prompt", (key) => locales.en[key]),
    /Missing Academy math template value: volume/
  );
});
