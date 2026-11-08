import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import {
  COMMUNITY_ERROR_KEYS,
  translateCommunityError,
} from "./apiErrors.ts";

const en = JSON.parse(await readFile(new URL("./locales/en.json", import.meta.url), "utf8"));
const nb = JSON.parse(await readFile(new URL("./locales/nb.json", import.meta.url), "utf8"));

test("community forum, friend, and message API errors have translations", async () => {
  const routeFiles = [
    "app/api/community/forum/route.ts",
    "app/api/community/forum/mutations/route.ts",
    "app/api/community/forum/images/route.ts",
    "app/api/community/forum/likes/route.ts",
    "app/api/community/forum/bookmarks/route.ts",
    "app/api/community/forum/moderation/route.ts",
    "app/api/community/friends/route.ts",
    "app/api/community/messages/route.ts",
    "app/api/community/notifications/route.ts",
    "app/api/community/social-notifications/route.ts",
    "app/api/community/achievement-notifications/route.ts",
    "app/api/community/achievement-rankings/route.ts",
    "app/api/community/mentions/route.ts",
    "app/api/community/reports/route.ts",
    "app/api/community/profile/route.ts",
  ];

  for (const file of routeFiles) {
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
    const messages = new Set();
    function collectStrings(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        messages.add(node.text);
      }
      ts.forEachChild(node, collectStrings);
    }
    function visit(node) {
      if (
        ts.isPropertyAssignment(node) &&
        ["error", "warning"].includes(node.name.getText(source))
      ) {
        collectStrings(node.initializer);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(messages.size > 0, file);
    for (const message of messages) {
      if (message === "23505") continue;
      assert.ok(Object.hasOwn(COMMUNITY_ERROR_KEYS, message), `${file}: ${message}`);
    }
  }

  for (const key of Object.values(COMMUNITY_ERROR_KEYS)) {
    assert.ok(Object.hasOwn(en, key), `en: ${key}`);
    assert.ok(Object.hasOwn(nb, key), `nb: ${key}`);
  }
});

test("community errors translate known messages and preserve unknown diagnostics", () => {
  const t = (key) => nb[key];
  assert.equal(translateCommunityError("Could not load inbox", t), "Kunne ikke laste inn innboksen");
  assert.equal(
    translateCommunityError("Unrecognized database diagnostic", t),
    "Unrecognized database diagnostic"
  );
});
