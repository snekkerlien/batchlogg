import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterPublicRecipes,
  publicRecipeFilterError,
  PUBLIC_RECIPE_PAGE_SIZE,
  searchableRecipeText,
  countRecipeBrewers,
  sortPublicRecipes,
} from "./publicRecipes.ts";

const filters = { search: "", type: "All types", minimumAbv: "", maximumAbv: "" };
const recipes = Array.from({ length: 125 }, (_, index) => ({
  id: String(index),
  name: `Recipe ${index}`,
  type: index % 2 === 0 ? "Mead" : "Beer",
  abv: index === 0 ? null : index % 20,
  searchText: searchableRecipeText([
    `Recipe ${index}`, index > 100 ? "Older brewer" : "Recent brewer",
    { fruits: [{ name: index === 124 ? "Cloudberry" : "Apple" }] },
  ]).toLocaleLowerCase(),
}));

test("counts and successive pages include recipes beyond the old 100-recipe cutoff", () => {
  const matches = filterPublicRecipes(recipes, filters);
  assert.equal(matches.length, 125);
  assert.equal(PUBLIC_RECIPE_PAGE_SIZE, 12);
  assert.equal(matches.slice(0, PUBLIC_RECIPE_PAGE_SIZE).length, 12);
  assert.equal(matches.slice(0, PUBLIC_RECIPE_PAGE_SIZE * 2).length, 24);
  assert.equal(matches.slice(0, PUBLIC_RECIPE_PAGE_SIZE * 11).length, 125);
  assert.equal(new Set(matches.map(recipe => recipe.id)).size, 125);
});

test("search and combined filters cover the whole collection before paging", () => {
  const older = filterPublicRecipes(recipes, { ...filters, search: " older BREWER " });
  assert.equal(older.length, 24);
  const ingredient = filterPublicRecipes(recipes, { ...filters, search: "Cloudberry" });
  assert.equal(ingredient.length, 1);
  assert.equal(ingredient[0].id, "124");
  const combined = filterPublicRecipes(recipes, {
    ...filters, search: "older brewer", type: "Mead", minimumAbv: "4", maximumAbv: "4",
  });
  assert.deepEqual(combined.map(recipe => recipe.id), ["104", "124"]);
});

test("missing ABV differs from a real 0% and invalid ranges are explicit", () => {
  const zero = filterPublicRecipes(recipes, { ...filters, minimumAbv: "0", maximumAbv: "0" });
  assert.ok(zero.length > 0);
  assert.ok(zero.every(recipe => recipe.abv === 0));
  assert.ok(!zero.some(recipe => recipe.id === "0"));
  assert.match(publicRecipeFilterError({ ...filters, minimumAbv: "15", maximumAbv: "5" }), /greater than/);
  assert.match(publicRecipeFilterError({ ...filters, minimumAbv: "-1" }), /between 0 and 100/);
  assert.match(publicRecipeFilterError({ ...filters, maximumAbv: "101" }), /between 0 and 100/);
  assert.equal(filterPublicRecipes(recipes, { ...filters, minimumAbv: "101" }).length, 0);
  assert.equal(publicRecipeFilterError(filters), null);
});

test("popularity counts unique brewers with active or genuinely finished batches, never cancellations", () => {
  const batch = (user, recipe, status, finished = null, snapshot = null) => ({
    user_id: user, recipe_id: recipe, status, finished_date: finished, recipe_snapshot: snapshot,
  });
  const counts = countRecipeBrewers([
    batch("brewer-1", "original", "Aktiv"),
    batch("brewer-1", "original", "finished", "2026-10-23"),
    batch("brewer-2", "private-copy", "Conditioning"),
    batch("brewer-3", "original", "cancelled", "2026-10-23"),
    batch("brewer-4", "original", "finished"),
    batch("brewer-5", "original", "Sekundær"),
    batch("brewer-6", "original", "secondary"),
    batch("brewer-7", "private-copy", "finished", "2026-10-23"),
    batch("brewer-8", null, "finished", "2026-10-23", { recipe_id: "deleted-copy", source_recipe_id: "original" }),
    batch("brewer-9", "private-recipe", "Aktiv"),
  ], new Map([["private-copy", "original"]]), new Set(["original"]));
  assert.equal(counts.get("original"), 6);
  assert.equal(counts.size, 1);
  const afterCancellation = countRecipeBrewers([
    batch("brewer-1", "original", "cancelled"),
  ], new Map(), new Set(["original"]));
  assert.equal(afterCancellation.get("original"), undefined);
});

test("snapshots retain the original recipe when a batch gets linked to a new saved version", () => {
  const counts = countRecipeBrewers([{
    user_id: "brewer", recipe_id: "new-finished-version", status: "finished",
    finished_date: "2026-10-23",
    recipe_snapshot: { recipe_id: "copy-used-to-start", source_recipe_id: "original" },
  }], new Map(), new Set(["original", "new-finished-version"]));
  assert.equal(counts.get("original"), 1);
  assert.equal(counts.has("new-finished-version"), false);
});

test("popularity sorting runs before paging with deterministic newest-first ties", () => {
  const items = [
    { id: "a", brewerCount: 1, created_at: "2026-10-23" },
    { id: "b", brewerCount: 3, created_at: "2026-09-01" },
    { id: "c", brewerCount: 3, created_at: "2026-10-01" },
    { id: "d", brewerCount: 0, created_at: "2026-10-24" },
  ];
  assert.deepEqual(sortPublicRecipes(items, "popular").map(recipe => recipe.id), ["c", "b", "a", "d"]);
  assert.deepEqual(sortPublicRecipes(items, "newest").map(recipe => recipe.id), ["d", "a", "c", "b"]);
  assert.equal(items[0].id, "a");
});
