import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { formatAcademyMathMessage } from "./academyMath.ts";

const page = await readFile(new URL("../../app/games/[game]/page.tsx", import.meta.url), "utf8");
const source = ts.createSourceFile("page.tsx", page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = source.statements.filter((statement) =>
  ts.isFunctionDeclaration(statement) && statement.name &&
  statement.getStart(source) < page.indexOf("function LearningGameFrame") &&
  statement.name.text !== "SourceCitation"
);
const games = source.statements.find((statement) =>
  ts.isVariableStatement(statement) &&
  statement.declarationList.declarations.some((declaration) => declaration.name.getText(source) === "LEARNING_GAMES")
);
assert.ok(games);
const code = ts.transpile(
  `${declarations.map((statement) => statement.getText(source)).join("\n")}\n${games.getText(source)}\n` +
  "globalThis.academy = { LEARNING_GAMES, createMathPracticeQuestions, createBrewDayPracticeQuestions, createFermentationPracticeQuestions, buildQuestions, displayQuestion, displayAnswer, displayExplanation, displayFeedback, displaySource, plainLanguageQuestion };",
  { target: ts.ScriptTarget.ES2022 }
);
const context = { formatAcademyMathMessage };
runInNewContext(code, context);
const { LEARNING_GAMES, createMathPracticeQuestions, createBrewDayPracticeQuestions, createFermentationPracticeQuestions, buildQuestions, displayQuestion, displayAnswer, displayExplanation, displayFeedback, displaySource, plainLanguageQuestion } = context.academy;
const nb = JSON.parse(await readFile(new URL("./locales/nb.json", import.meta.url), "utf8"));
const t = (key) => {
  if (!Object.hasOwn(nb, key)) throw new Error(`Missing nb translation: ${key}`);
  return nb[key];
};

test("translated authored questions keep stable identifiers and display all answers and feedback", () => {
  const questions = LEARNING_GAMES["brew-basics"].questions.slice(0, 100);
  assert.equal(questions.length, 100);
  for (const question of questions) {
    const originalPrompt = question.prompt;
    const correct = question.answers.find((answer) => answer.correct);
    assert.ok(correct);
    assert.equal(displayQuestion(question, "en", t), plainLanguageQuestion(originalPrompt));
    assert.notEqual(displayQuestion(question, "nb", t), originalPrompt);
    for (const answer of question.answers) {
      assert.equal(displayAnswer(answer.text, "en", t), answer.text);
      assert.notEqual(displayAnswer(answer.text, "nb", t), answer.text);
      assert.equal(displayFeedback(question, answer, "en", t), answer.feedback);
      const feedback = displayFeedback(question, answer, "nb", t);
      assert.ok(feedback);
      if (!answer.correct) assert.ok(feedback.includes(displayAnswer(correct.text, "nb", t)));
    }
    assert.equal(displayExplanation(question, correct.feedback, "nb", t), t(correct.feedback));
    assert.equal(question.prompt, originalPrompt);
  }
});

test("English rendering preserves every Academy prompt, answer, and feedback", () => {
  for (const [gameId, game] of Object.entries(LEARNING_GAMES)) {
    const questions = gameId === "brew-math-lab"
      ? ["metric", "imperial"].flatMap((units) => buildQuestions(createMathPracticeQuestions(units)))
      : game.questions;
    for (const question of questions) {
      assert.equal(displayQuestion(question, "en", t), plainLanguageQuestion(question.prompt));
      for (const answer of question.answers) {
        assert.equal(displayAnswer(answer.text, "en", t), answer.text);
        assert.equal(displayFeedback(question, answer, "en", t), answer.feedback);
      }
    }
  }
});

test("translated brew-day questions include their individual answer feedback", () => {
  for (const [index, question] of LEARNING_GAMES["brew-day-sequence"].questions.entries()) {
    assert.ok(displayQuestion(question, "nb", t));
    for (const answer of question.answers) {
      assert.ok(displayAnswer(answer.text, "nb", t));
      const feedback = displayFeedback(question, answer, "nb", t);
      assert.ok(feedback);
      if (index < 6) assert.equal(feedback, t(answer.feedback));
    }
  }
});

test("translated brew-day practice questions include all answers and feedback", () => {
  for (const question of buildQuestions(createBrewDayPracticeQuestions())) {
    assert.ok(displayQuestion(question, "nb", t), question.prompt);
    for (const answer of question.answers) {
      assert.ok(displayAnswer(answer.text, "nb", t), answer.text);
      assert.ok(displayFeedback(question, answer, "nb", t), answer.feedback);
    }
  }
});

test("translated fermentation practice questions include all answers and feedback", () => {
  for (const question of buildQuestions(createFermentationPracticeQuestions())) {
    assert.ok(displayQuestion(question, "nb", t), question.prompt);
    for (const answer of question.answers) {
      assert.ok(displayAnswer(answer.text, "nb", t), answer.text);
      assert.ok(displayFeedback(question, answer, "nb", t), answer.feedback);
    }
  }
});

test("translated fermentation detective questions include all feedback", () => {
  for (const [index, question] of LEARNING_GAMES["fermentation-detective"].questions.entries()) {
    assert.ok(displayQuestion(question, "nb", t), question.prompt);
    for (const answer of question.answers) {
      assert.ok(displayAnswer(answer.text, "nb", t), answer.text);
      const feedback = displayFeedback(question, answer, "nb", t);
      assert.ok(feedback);
      if (index < 5) assert.equal(feedback, t(answer.feedback));
    }
  }
});

test("flavor and aroma questions display translated prompts, answers, and feedback", () => {
  const questions = LEARNING_GAMES["flavor-aroma"].questions;
  assert.equal(questions.length, 25);
  for (const question of questions) {
    assert.ok(displayQuestion(question, "nb", t), question.prompt);
    assert.ok(displaySource(question.source ?? LEARNING_GAMES["flavor-aroma"].source, "nb", t));
    for (const answer of question.answers) {
      assert.ok(displayAnswer(answer.text, "nb", t), answer.text);
      assert.ok(displayFeedback(question, answer, "nb", t), answer.feedback);
    }
  }
});

test("translated recipe builder questions include all answers and feedback", () => {
  for (const question of LEARNING_GAMES["recipe-builder"].questions) {
    assert.ok(displayQuestion(question, "nb", t), question.prompt);
    for (const answer of question.answers) {
      assert.ok(displayAnswer(answer.text, "nb", t), answer.text);
      assert.ok(displayFeedback(question, answer, "nb", t), answer.feedback);
    }
  }
});

test("Academy sources have Norwegian translations", () => {
  for (const game of Object.values(LEARNING_GAMES)) {
    assert.ok(displaySource(game.source, "nb", t), game.source);
    for (const question of game.questions) {
      if (question.source) assert.ok(displaySource(question.source, "nb", t), question.source);
    }
  }
  assert.equal(displaySource("Wikipedia: Brewing — process overview", "en", t), "Wikipedia — Brewing — process overview");
});

test("sulfur and solvent questions do not reject true or overlapping answers", () => {
  const questions = LEARNING_GAMES["flavor-aroma"].questions;
  const sulfur = questions.find((question) => question.prompt.startsWith("A lager has a sulfur smell"));
  const solvent = questions.find((question) => question.prompt.includes("a hot, solvent-like aroma"));
  assert.ok(sulfur);
  assert.ok(solvent);
  for (const answer of sulfur.answers.filter((answer) => !answer.correct)) {
    assert.ok(!answer.text.includes("may"), answer.text);
  }
  assert.ok(!solvent.answers.some((answer) => !answer.correct && answer.text === "Ethyl acetate"));
});

test("brew-day questions do not reject legitimate intermediate steps", () => {
  const excludedChoices = [
    "Raise the mash to mash-out temperature, then begin runoff",
    "Recirculate the first cloudy runoff, then collect the wort",
    "Check pre-boil volume and gravity, then bring the wort to a boil",
    "Whirlpool or settle the wort, then chill it to pitching temperature",
    "Measure the cooled wort and aerate or oxygenate it as the process calls for",
  ];
  for (const question of LEARNING_GAMES["brew-day-sequence"].questions.slice(0, 6)) {
    assert.equal(question.answers.filter((answer) => answer.correct).length, 1);
    for (const answer of question.answers) {
      assert.ok(answer.correct || !excludedChoices.includes(answer.text), answer.text);
    }
  }
  const kettle = LEARNING_GAMES["brew-day-sequence"].questions.find((question) =>
    question.prompt === "Why avoid leaving a kettle unattended during heating and boiling?"
  );
  assert.ok(kettle);
  assert.ok(!kettle.answers.some((answer) =>
    !answer.correct && answer.text === "The wort can foam up and boil over as it approaches a boil"
  ));
});

test("generated math display keeps numeric answers and localizes feedback in both units", () => {
  for (const units of ["metric", "imperial"]) {
    const questions = buildQuestions(createMathPracticeQuestions(units).slice(8));
    for (const question of questions) {
      assert.ok(displayQuestion(question, "nb", t));
      for (const answer of question.answers) {
        assert.equal(displayAnswer(answer.text, "nb", t), answer.text);
        assert.ok(displayFeedback(question, answer, "nb", t));
      }
    }
  }
});

test("fixed math questions are translated in both unit systems", () => {
  for (const units of ["metric", "imperial"]) {
    const questions = buildQuestions(createMathPracticeQuestions(units).slice(0, 8));
    for (const question of questions) {
      assert.ok(displayQuestion(question, "nb", t));
      if (question.hint) assert.ok(t(question.hint));
      for (const answer of question.answers) {
        assert.ok(displayAnswer(answer.text, "nb", t));
        assert.ok(displayFeedback(question, answer, "nb", t));
      }
    }
  }
});

test("numeric answers do not bypass translation of words", () => {
  assert.equal(displayAnswer("12 L", "nb", t), "12 L");
  assert.equal(displayAnswer("75%", "nb", t), "75%");
  assert.throws(() => displayAnswer("3 hours", "nb", t), /Missing nb translation/);
});

test("all Academy questions have Norwegian content and sources", () => {
  for (const [gameId, game] of Object.entries(LEARNING_GAMES)) {
    assert.ok(displaySource(game.source, "nb", t), game.source);
    const pools = gameId === "brew-math-lab"
      ? ["metric", "imperial"].flatMap((units) => buildQuestions(createMathPracticeQuestions(units)))
      : game.questions;
    for (const question of pools) {
      assert.ok(displayQuestion(question, "nb", t), question.prompt);
      if (question.source) assert.ok(displaySource(question.source, "nb", t), question.source);
      if (question.hint) assert.ok(t(question.hint));
      for (const answer of question.answers) {
        assert.ok(displayAnswer(answer.text, "nb", t));
        assert.ok(displayFeedback(question, answer, "nb", t));
      }
    }
  }
});
