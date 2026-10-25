import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePublicMentions } from "./mentions.ts";

const recipeId = "a4d57aa8-6d11-428c-bb19-51f91c48e0ba";
const batchId = "902ff911-aeec-4f58-80cc-912de7af76d9";

test("parses tagged public recipes and batches while retaining surrounding text", () => {
  assert.deepEqual(
    parsePublicMentions(
      `Try [@Pale%20Ale](batchlogg://recipe/${recipeId}?context=Beer%20%C2%B7%20IPA) with [@Summer%20Batch](batchlogg://batch/${batchId})!`
    ),
    [
      { type: "recipe", id: recipeId, name: "Pale%20Ale", context: "Beer · IPA" },
      { type: "batch", id: batchId, name: "Summer%20Batch", context: undefined },
    ]
  );
});

test("does not treat malformed or unsupported mention links as references", () => {
  assert.deepEqual(
    parsePublicMentions(
      "[@Hidden](batchlogg://recipe/not-a-uuid) [@Other](https://example.com)"
    ),
    []
  );
});

test("treats missing mention text as empty", () => {
  assert.deepEqual(parsePublicMentions(null), []);
  assert.deepEqual(parsePublicMentions(undefined), []);
});
