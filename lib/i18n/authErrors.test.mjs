import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import {
  AUTH_API_ERROR_KEYS,
  LOGIN_AUTH_CODE_KEYS,
  LOGIN_AUTH_MESSAGE_KEYS,
  SIGNUP_AUTH_CODE_KEYS,
  translateAuthApiError,
  translateAuthCode,
} from "./apiErrors.ts";
import { SITE_LANGUAGES } from "./language.ts";

const locales = Object.fromEntries(await Promise.all(
  SITE_LANGUAGES.map(async ({ code }) => [
    code,
    JSON.parse(await readFile(new URL(`./locales/${code}.json`, import.meta.url), "utf8")),
  ])
));

test("authentication API errors and provider error codes have translations", async () => {
  for (const file of [
    "app/api/auth/callback/route.ts",
    "app/api/auth/signup/route.ts",
    "app/api/profile/username-availability/route.ts",
    "app/api/profile/create/route.ts",
  ]) {
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
    const errors = new Set();
    function visit(node) {
      if (ts.isPropertyAssignment(node) && node.name.getText(source) === "error" && ts.isStringLiteral(node.initializer)) {
        errors.add(node.initializer.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(errors.size > 0, file);
    for (const error of errors) assert.ok(Object.hasOwn(AUTH_API_ERROR_KEYS, error), `${file}: ${error}`);
  }
  for (const [code, messages] of Object.entries(locales)) {
    for (const mapping of [AUTH_API_ERROR_KEYS, LOGIN_AUTH_CODE_KEYS, LOGIN_AUTH_MESSAGE_KEYS, SIGNUP_AUTH_CODE_KEYS]) {
      for (const key of Object.values(mapping)) assert.ok(Object.hasOwn(messages, key), `${code}: ${key}`);
    }
  }
});

test("authentication errors translate known codes and preserve unknown server details", () => {
  const t = (key) => locales.nb[key];
  assert.equal(translateAuthApiError("A username of 1 to 64 characters is required.", t), "Brukernavnet må være på 1 til 64 tegn.");
  assert.equal(translateAuthCode("email_not_confirmed", t, LOGIN_AUTH_CODE_KEYS), "Bekreft e-postadressen din før du logger inn.");
  assert.equal(translateAuthCode("email_exists", t, SIGNUP_AUTH_CODE_KEYS), "Det finnes allerede en konto med denne e-postadressen.");
  assert.equal(translateAuthCode("email_address_invalid", t, SIGNUP_AUTH_CODE_KEYS), "Skriv inn en gyldig e-postadresse.");
  assert.equal(translateAuthCode("weak_password", t, SIGNUP_AUTH_CODE_KEYS), "Passordet oppfyller ikke sikkerhetskravene.");
  assert.equal(translateAuthCode("unknown_code", t, SIGNUP_AUTH_CODE_KEYS), undefined);
  assert.equal(translateAuthCode("toString", t, SIGNUP_AUTH_CODE_KEYS), undefined);
  assert.equal(translateAuthApiError("Unexpected server diagnostic", t), "Unexpected server diagnostic");
});
