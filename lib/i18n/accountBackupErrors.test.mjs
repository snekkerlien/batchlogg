import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import {
  ACCOUNT_BACKUP_ERROR_KEYS,
  translateAccountBackupMessage,
} from "./apiErrors.ts";

const en = JSON.parse(await readFile(new URL("./locales/en.json", import.meta.url), "utf8"));
const nb = JSON.parse(await readFile(new URL("./locales/nb.json", import.meta.url), "utf8"));

test("account export and restore errors have translations", async () => {
  const files = [
    "app/api/account/export/route.ts",
    "app/api/account/restore/route.ts",
  ];

  for (const file of files) {
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
        node.name.getText(source) === "error"
      ) {
        collectStrings(node.initializer);
      }
      if (
        ts.isNewExpression(node) &&
        node.expression.getText(source) === "Error"
      ) {
        for (const argument of node.arguments ?? []) {
          if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
            messages.add(argument.text);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);

    for (const message of messages) {
      assert.ok(
        Object.hasOwn(ACCOUNT_BACKUP_ERROR_KEYS, message) ||
          message.startsWith("Could not export ") ||
          message.startsWith("Backup is missing ") ||
          message.startsWith("Backup contains an invalid ") ||
          message.startsWith("Backup contains an unsafe "),
        `${file}: ${message}`
      );
    }
  }

  for (const key of Object.values(ACCOUNT_BACKUP_ERROR_KEYS)) {
    assert.ok(Object.hasOwn(en, key), `en: ${key}`);
    assert.ok(Object.hasOwn(nb, key), `nb: ${key}`);
  }
});

test("backup errors and restore warnings translate while unknown diagnostics stay visible", () => {
  const t = (key) => nb[key];
  assert.equal(
    translateAccountBackupMessage("Backup is missing metadata.json", t),
    "Sikkerhetskopien mangler metadata.json."
  );
  assert.equal(
    translateAccountBackupMessage(
      "Restore stopped while importing batches. 4 records were processed before the error: database unavailable",
      t
    ),
    "Gjenopprettingen stoppet under import av batches. 4 poster var behandlet før feilen: database unavailable"
  );
  assert.equal(
    translateAccountBackupMessage(
      "Backup restored. Existing records were left unchanged; archived profile and settings were restored where possible. Some saved discussions were not restored because they no longer exist.",
      t
    ),
    "Sikkerhetskopien er gjenopprettet. Eksisterende poster ble beholdt, og profil og innstillinger fra arkivet ble gjenopprettet der det var mulig. Noen lagrede diskusjoner ble ikke gjenopprettet fordi de ikke lenger finnes."
  );
  assert.equal(
    translateAccountBackupMessage("Unrecognized database diagnostic", t),
    "Unrecognized database diagnostic"
  );
});

test("language preference is included in backup restore and refreshed after restore", async () => {
  const [exportRoute, restoreRoute, settingsPage, provider, firstLogin, profileCreate] = await Promise.all([
    readFile("app/api/account/export/route.ts", "utf8"),
    readFile("app/api/account/restore/route.ts", "utf8"),
    readFile("app/(ui)/settings/page.tsx", "utf8"),
    readFile("app/components/LanguageProvider.tsx", "utf8"),
    readFile("app/components/FirstLoginSetup.tsx", "utf8"),
    readFile("app/api/profile/create/route.ts", "utf8"),
  ]);
  assert.match(exportRoute, /select\("\*"\)/);
  assert.match(exportRoute, /"profile\.json", profile/);
  assert.match(restoreRoute, /"preferred_language"/);
  assert.match(restoreRoute, /isSiteLanguage\(value\)/);
  assert.match(settingsPage, /batchlogg-profile-restored/);
  assert.match(provider, /addEventListener\("batchlogg-profile-restored", loadLanguage\)/);
  assert.match(provider, /isAvailableSiteLanguage\(data\?\.preferred_language\)/);
  assert.match(firstLogin, /preferred_language: language/);
  assert.match(profileCreate, /preferred_language: "en"/);
});
