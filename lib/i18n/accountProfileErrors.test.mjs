import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import {
  ACCOUNT_PROFILE_ERROR_KEYS,
  translateAccountProfileError,
} from "./apiErrors.ts";

const en = JSON.parse(await readFile(new URL("./locales/en.json", import.meta.url), "utf8"));
const nb = JSON.parse(await readFile(new URL("./locales/nb.json", import.meta.url), "utf8"));

test("profile, username, moderation, and restriction errors have translations", async () => {
  const files = [
    "app/api/profile/route.ts",
    "app/api/profile/username/route.ts",
    "app/api/profile/username-availability/route.ts",
    "app/api/account/moderation/route.ts",
    "app/api/account/restrictions/route.ts",
    "app/api/account/ban-appeal/route.ts",
  ];

  for (const file of files) {
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
    const messages = new Set();
    function collectStrings(node) {
      if (ts.isStringLiteral(node)) messages.add(node.text);
      ts.forEachChild(node, collectStrings);
    }
    function visit(node) {
      if (ts.isPropertyAssignment(node) && node.name.getText(source) === "error") {
        collectStrings(node.initializer);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    for (const message of messages) {
      if (message === "23505") continue;
      assert.ok(Object.hasOwn(ACCOUNT_PROFILE_ERROR_KEYS, message), `${file}: ${message}`);
    }
  }

  for (const key of Object.values(ACCOUNT_PROFILE_ERROR_KEYS)) {
    assert.ok(Object.hasOwn(en, key), `en: ${key}`);
    assert.ok(Object.hasOwn(nb, key), `nb: ${key}`);
  }
});

test("profile errors translate known messages and preserve unknown diagnostics", () => {
  const t = (key) => nb[key];
  assert.equal(
    translateAccountProfileError("Username must be between 1 and 64 characters.", t),
    "Brukernavnet må inneholde mellom 1 og 64 tegn."
  );
  assert.equal(
    translateAccountProfileError("An appeal can only be sent while your account is banned.", t),
    "En anke kan bare sendes mens kontoen din er utestengt."
  );
  assert.equal(
    translateAccountProfileError("Unrecognized database diagnostic", t),
    "Unrecognized database diagnostic"
  );
});
