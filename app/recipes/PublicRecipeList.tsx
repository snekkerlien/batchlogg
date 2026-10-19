"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RecipePresentation, { type RecipePresentationData } from "@/app/components/RecipePresentation";

type PublicRecipe = RecipePresentationData & {
  id: string;
  user_id: string;
  created_at: string;
  author: string;
  source: { id: string; name: string; author: string } | null;
};

function searchableText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(searchableText).join(" ");
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).map(searchableText).join(" ");
  }
  return "";
}

export default function PublicRecipeList({
  recipes,
}: {
  recipes: PublicRecipe[];
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All types");
  const [minimumAbv, setMinimumAbv] = useState("");
  const [maximumAbv, setMaximumAbv] = useState("");
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const types = useMemo(
    () => [...new Set(recipes.map((recipe) => recipe.type).filter(Boolean))].sort(),
    [recipes]
  );
  const filteredRecipes = recipes.filter((recipe) => {
    const searchText = [
      recipe.name,
      recipe.author,
      recipe.type,
      recipe.ingredients,
      recipe.malts,
      recipe.hops,
      recipe.dry_hops,
      recipe.fruits,
      recipe.honey_type,
      recipe.juice_type,
      recipe.base_liquid,
      recipe.yeast,
      recipe.additives,
    ]
      .map(searchableText)
      .join(" ")
      .toLocaleLowerCase();
    const query = search.trim().toLocaleLowerCase();
    const abv = recipe.abv == null ? null : Number(recipe.abv);
    return (
      (!query || searchText.includes(query)) &&
      (type === "All types" || recipe.type === type) &&
      (minimumAbv === "" || (abv !== null && abv >= Number(minimumAbv))) &&
      (maximumAbv === "" || (abv !== null && abv <= Number(maximumAbv)))
    );
  });

  if (!recipes.length) {
    return (
      <p className="rounded-lg border border-white/10 bg-white/5 p-5 text-white/70">
        No public recipes are available yet. Members can choose which recipes
        to share from their recipe library.
      </p>
    );
  }

  return (
    <>
      <section
        aria-label="Filter public recipes"
        className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2"
      >
        <label className="sm:col-span-2">
          <span className="sr-only">Search recipes and ingredients</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipes, brewers, or ingredients"
            className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Recipe type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="rounded-lg border border-white/20 bg-black/40 p-3"
          >
            <option>All types</option>
            {types.map((recipeType) => (
              <option key={recipeType}>{recipeType}</option>
            ))}
          </select>
        </label>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-sm">ABV range (%)</legend>
          <label>
            <span className="sr-only">Minimum ABV</span>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={minimumAbv}
              onChange={(event) => setMinimumAbv(event.target.value)}
              placeholder="Min"
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            />
          </label>
          <label>
            <span className="sr-only">Maximum ABV</span>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={maximumAbv}
              onChange={(event) => setMaximumAbv(event.target.value)}
              placeholder="Max"
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            />
          </label>
        </fieldset>
      </section>

      {filteredRecipes.length ? (
        <ul className="space-y-3">
          {filteredRecipes.map((recipe) => (
            <li
              key={recipe.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20"
            >
              <button
                type="button"
                aria-expanded={expandedRecipeId === recipe.id}
                aria-controls={`public-recipe-${recipe.id}`}
                onClick={() => setExpandedRecipeId(
                  expandedRecipeId === recipe.id ? null : recipe.id
                )}
                className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-lg font-semibold text-white">{recipe.name}</span>
                  <span className="mt-1 block text-sm text-white/60">
                    {recipe.type} <span aria-hidden="true">·</span> by {recipe.author}
                    {recipe.abv != null && <> <span aria-hidden="true">·</span> {Number(recipe.abv).toFixed(1)}% ABV</>}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`shrink-0 text-2xl text-white transition-transform duration-200 ${
                    expandedRecipeId === recipe.id ? "rotate-90" : "rotate-180"
                  }`}
                >
                  ▶
                </span>
              </button>
              <div
                id={`public-recipe-${recipe.id}`}
                aria-hidden={expandedRecipeId !== recipe.id}
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  expandedRecipeId === recipe.id ? "max-h-[6000px] mt-4" : "max-h-0"
                }`}
              >
                <div className="border-t border-white/10 px-4 pb-5 pt-5 sm:px-5">
                  {recipe.source && (
                    <p className="mb-4 text-sm text-white/65">
                      A version of{" "}
                      <Link
                        href={`/members/${encodeURIComponent(recipe.source.author)}/recipes/${recipe.source.id}`}
                        tabIndex={expandedRecipeId === recipe.id ? 0 : -1}
                        className="text-green-200 underline"
                      >
                        {recipe.source.name}
                      </Link>
                      {" "}by {recipe.source.author}
                    </p>
                  )}
                  <RecipePresentation
                    recipe={recipe}
                    linkTabIndex={expandedRecipeId === recipe.id ? undefined : -1}
                  />
                  <div className="mt-5 flex justify-end">
                    <Link
                      tabIndex={expandedRecipeId === recipe.id ? 0 : -1}
                      href={`/members/${encodeURIComponent(recipe.author)}/recipes/${recipe.id}`}
                      className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      Open standalone recipe
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-white/10 bg-white/5 p-5 text-white/70">
          No recipes match these filters.
        </p>
      )}
    </>
  );
}
