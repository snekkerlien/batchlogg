"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type PublicRecipe = {
  id: number;
  user_id: string;
  name: string;
  type: string;
  og: number | null;
  abv: number | null;
  volume: number | null;
  created_at: string;
  author: string;
  ingredients: unknown;
  malts: unknown;
  hops: unknown;
  dry_hops: unknown;
  fruits: unknown;
  honey_type: string | null;
  juice_type: string | null;
  base_liquid: string | null;
  yeast: string | null;
  additives: string | null;
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
        <ul className="space-y-4">
          {filteredRecipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/members/${encodeURIComponent(recipe.author)}/recipes/${recipe.id}`}
                className="block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
              >
                <h2 className="text-xl font-semibold">{recipe.name}</h2>
                <p className="mt-1 text-sm text-white/65">
                  {recipe.type} · by {recipe.author}
                </p>
                <p className="mt-3 text-sm text-white/75">
                  {recipe.og != null && <>OG {Number(recipe.og).toFixed(3)} · </>}
                  {recipe.abv != null && <>ABV {Number(recipe.abv).toFixed(1)}% · </>}
                  {recipe.volume != null && <>Volume {recipe.volume} L</>}
                </p>
              </Link>
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
