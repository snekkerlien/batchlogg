import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  isAvailableSiteLanguage,
  isSiteLanguage,
  getPageLanguage,
  languageStorageKey,
  NORWEGIAN_BOKMAL_READY,
} from "./language.ts";

test("Norwegian Bokmal is available with complete interface coverage", () => {
  assert.equal(NORWEGIAN_BOKMAL_READY, true);
  assert.equal(isSiteLanguage("nb"), true);
  assert.equal(isAvailableSiteLanguage("en"), true);
  assert.equal(isAvailableSiteLanguage("nb"), true);
  assert.equal(isAvailableSiteLanguage("sv"), false);
});

test("cached language preferences are scoped to the signed-in account", () => {
  assert.equal(languageStorageKey(), "batchlog-language");
  assert.equal(languageStorageKey("user-a"), "batchlog-language:user-a");
  assert.notEqual(languageStorageKey("user-a"), languageStorageKey("user-b"));
});

test("admin pages remain English without affecting other routes", () => {
  assert.equal(getPageLanguage("nb", "/admin"), "en");
  assert.equal(getPageLanguage("nb", "/admin/feedback"), "en");
  assert.equal(getPageLanguage("nb", "/administrator"), "nb");
  assert.equal(getPageLanguage("nb", "/settings"), "nb");
  assert.equal(getPageLanguage("en", "/settings"), "en");
});

test("first-login preferences persist language only after the account-scoped save succeeds", async () => {
  const [component, action, english, norwegian] = await Promise.all([
    readFile("app/components/FirstLoginSetup.tsx", "utf8"),
    readFile("app/actions/userPreferences.ts", "utf8"),
    readFile("lib/i18n/locales/en.json", "utf8").then(JSON.parse),
    readFile("lib/i18n/locales/nb.json", "utf8").then(JSON.parse),
  ]);
  const saveIndex = component.indexOf("await saveUserPreferences(");
  const reducedMotionIndex = component.indexOf("setReducedMotionPreference(reducedMotion)");
  const languageIndex = component.indexOf("applyLanguage(language)", saveIndex);
  assert.ok(saveIndex >= 0);
  assert.ok(reducedMotionIndex > saveIndex);
  assert.ok(languageIndex > saveIndex);
  assert.match(action, /preferred_language: preferences\.preferred_language/);
  assert.match(action, /user\.id !== expectedUserId/);
  for (const locale of [english, norwegian]) {
    assert.ok(Object.hasOwn(locale, "The signed-in account changed. Please try again."));
  }
});
