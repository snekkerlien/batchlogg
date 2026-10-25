import assert from "node:assert/strict";
import { test } from "node:test";
import { recipeOwnerFilter } from "./ownership.ts";

test("recipe ownership filters target only the authenticated user", () => {
  assert.deepEqual(recipeOwnerFilter("signed-in-user"), [
    "user_id",
    "signed-in-user",
  ]);
});
