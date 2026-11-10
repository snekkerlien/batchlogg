import assert from "node:assert/strict";
import { test } from "node:test";
import { visibleAchievementCategories } from "./visibility.ts";

test("rating achievements are excluded while reviews are hidden", () => {
  const categories = [
    { stat: "totalBatches", tiers: ["First Batch"] },
    { stat: "totalRatings", tiers: ["First Rating", "Trusted Taster"] },
    { stat: "forumPosts", tiers: ["First Post"] },
  ];
  assert.deepEqual(visibleAchievementCategories(categories, false), [categories[0], categories[2]]);
  assert.deepEqual(visibleAchievementCategories(categories, true), categories);
  assert.equal(categories.length, 3);
});
