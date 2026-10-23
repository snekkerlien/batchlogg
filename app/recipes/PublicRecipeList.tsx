"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import RecipePresentation, { type RecipePresentationData } from "@/app/components/RecipePresentation";
import ExpandArrowButton from "@/app/components/ExpandArrowButton";
import { Qty } from "@/app/components/Units";
import StartPublicRecipeButton from "@/app/components/StartPublicRecipeButton";
import { useAuthContext } from "@/app/providers/AuthProvider";
import {
  filterPublicRecipes,
  publicRecipeFilterError,
  PUBLIC_RECIPE_PAGE_SIZE,
  sortPublicRecipes,
  type PublicRecipeSort,
  type PublicRecipeSummary,
} from "@/lib/recipes/publicRecipes";

export default function PublicRecipeList({
  recipes,
}: {
  recipes: PublicRecipeSummary[];
}) {
  const { user, loading: authLoading } = useAuthContext();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All types");
  const [minimumAbv, setMinimumAbv] = useState("");
  const [maximumAbv, setMaximumAbv] = useState("");
  const [sort, setSort] = useState<PublicRecipeSort>("newest");
  const [requestedStart, setRequestedStart] = useState<string | null>(null);
  useEffect(() => {
    setRequestedStart(new URLSearchParams(window.location.search).get("start"));
  }, []);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PUBLIC_RECIPE_PAGE_SIZE);
  const [details, setDetails] = useState<Record<string, RecipePresentationData>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const pendingDetails = useRef(new Set<string>());
  const recipeItems = useRef(new Map<string, HTMLLIElement>());
  const types = useMemo(
    () => [...new Set(recipes.map((recipe) => recipe.type).filter(Boolean))].sort(),
    [recipes]
  );
  const filters = { search, type, minimumAbv, maximumAbv };
  const filterError = publicRecipeFilterError(filters);
  const filteredRecipes = useMemo(
    () => sortPublicRecipes(filterPublicRecipes(recipes, { search, type, minimumAbv, maximumAbv }), sort),
    [recipes, search, type, minimumAbv, maximumAbv, sort]
  );
  const visibleRecipes = filteredRecipes.slice(0, visibleCount);
  const hasFilters = Boolean(search || type !== "All types" || minimumAbv || maximumAbv);

  function resetVisibleRecipes() {
    setVisibleCount(PUBLIC_RECIPE_PAGE_SIZE);
    setExpandedRecipeId(null);
  }

  function clearFilters() {
    setSearch("");
    setType("All types");
    setMinimumAbv("");
    setMaximumAbv("");
    resetVisibleRecipes();
  }

  async function loadDetails(id: string) {
    if (pendingDetails.current.has(id) || details[id]) return;
    pendingDetails.current.add(id);
    setLoadingDetails(current => ({ ...current, [id]: true }));
    setDetailErrors(current => ({ ...current, [id]: "" }));
    try {
      const response = await fetch(`/api/public-recipes/${encodeURIComponent(id)}`, { cache: "no-store" });
      const result: { recipe?: RecipePresentationData; error?: string } = await response.json();
      if (!response.ok || !result.recipe) {
        throw new Error(result.error || "Could not load recipe details. Please try again.");
      }
      const recipe = result.recipe;
      setDetails(current => ({ ...current, [id]: recipe }));
    } catch (error) {
      console.error("Could not load public recipe details", error);
      setDetailErrors(current => ({
        ...current,
        [id]: error instanceof Error ? error.message : "Could not load recipe details. Please try again.",
      }));
    } finally {
      pendingDetails.current.delete(id);
      setLoadingDetails(current => ({ ...current, [id]: false }));
    }
  }

  function toggleRecipe(id: string) {
    const opening = expandedRecipeId !== id;
    setExpandedRecipeId(opening ? id : null);
    if (opening) void loadDetails(id);
  }

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
      {!authLoading && user && requestedStart && recipes.some(recipe => recipe.id === requestedStart) && (
        <section aria-label="Continue starting your batch" className="mb-5 rounded-lg border border-green-400/30 bg-green-400/5 p-4">
          <p className="mb-3 text-sm">Continue with {recipes.find(recipe => recipe.id === requestedStart)?.name}. Choose an empty vessel on the next screen.</p>
          <StartPublicRecipeButton recipeId={requestedStart} />
        </section>
      )}
      <section
        aria-label="Filter public recipes"
        className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2"
      >
        <label className="sm:col-span-2">
          <span className="sr-only">Search recipes and ingredients</span>
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); resetVisibleRecipes(); }}
            placeholder="Search recipes, brewers, or ingredients"
            className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Recipe type
          <select
            value={type}
            onChange={(event) => { setType(event.target.value); resetVisibleRecipes(); }}
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
              onChange={(event) => { setMinimumAbv(event.target.value); resetVisibleRecipes(); }}
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
              onChange={(event) => { setMaximumAbv(event.target.value); resetVisibleRecipes(); }}
              placeholder="Max"
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            />
          </label>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Sort recipes
          <select
            value={sort}
            onChange={event => {
              setSort(event.target.value === "popular" ? "popular" : "newest");
              resetVisibleRecipes();
            }}
            className="rounded-lg border border-white/20 bg-black/40 p-3"
          >
            <option value="newest">Newest first</option>
            <option value="popular">Most popular</option>
          </select>
        </label>
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p role="status" aria-live="polite" aria-atomic="true" className="text-white/65">
          {filterError
            ? "Update the ABV range to see matching recipes."
            : `Showing ${visibleRecipes.length} of ${filteredRecipes.length} ${hasFilters ? "matching " : ""}${filteredRecipes.length === 1 ? "recipe" : "recipes"}${hasFilters ? ` · ${recipes.length} public in total` : ""}`}
          {!filterError && <span className="text-white/45"> · {sort === "popular" ? "Most popular" : "Newest first"}</span>}
        </p>
        {hasFilters && <button type="button" onClick={clearFilters} className="min-h-11 rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
          Clear filters
        </button>}
      </div>
      {filterError && <p role="alert" className="mb-4 text-sm text-amber-200">{filterError}</p>}

      {filteredRecipes.length ? (
        <ul id="public-recipe-results" className="space-y-3">
          {visibleRecipes.map((recipe) => (
            <li
              key={recipe.id}
              ref={element => {
                if (element) recipeItems.current.set(recipe.id, element);
                else recipeItems.current.delete(recipe.id);
              }}
              tabIndex={-1}
              aria-label={recipe.name || "Untitled recipe"}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300"
            >
              <div className="flex w-full items-start justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                  <Link href={`/members/${encodeURIComponent(recipe.author)}/recipes/${recipe.id}`} className="block break-words text-lg font-semibold text-white hover:text-green-200">{recipe.name}</Link>
                  <p className="mt-1 text-sm text-white/60">
                    {recipe.category} <span aria-hidden="true">·</span> by{" "}
                    <Link href={`/members/${encodeURIComponent(recipe.author)}`} className="text-green-200 underline underline-offset-2">{recipe.author}</Link>
                  </p>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/70">
                    <span>{recipe.abv != null && recipe.abv !== "" && Number.isFinite(Number(recipe.abv)) ? `${Number(recipe.abv).toFixed(1)}% ABV` : "ABV not provided"}</span>
                    <span>{recipe.volume != null && recipe.volume !== "" && Number.isFinite(Number(recipe.volume)) ? <>Batch: <Qty kind="volume" value={recipe.volume} /></> : "Volume not provided"}</span>
                    <span>Created {recipe.created_at ? new Date(recipe.created_at).toLocaleDateString("en-GB") : "date unavailable"}</span>
                    <span title="Unique brewers with active or finished batches. Cancelled batches do not count.">
                      Brewed by {recipe.brewerCount} {recipe.brewerCount === 1 ? "brewer" : "brewers"}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-white/55">
                    {recipe.copyright_free ? `Marked copyright-free by ${recipe.author}` : `Copyright belongs to ${recipe.author}`}
                  </p>
                  {recipe.source && (
                    <p className="mt-2 text-sm text-white/65">
                      A version of{" "}
                      <Link
                        href={`/members/${encodeURIComponent(recipe.source.author)}/recipes/${recipe.source.id}`}
                        className="text-green-200 underline"
                      >
                        {recipe.source.name}
                      </Link>
                      {" "}by{" "}
                      <Link href={`/members/${encodeURIComponent(recipe.source.author)}`} className="text-green-200 underline">{recipe.source.author}</Link>
                    </p>
                  )}
                  {!authLoading && user && <div className="mt-3">
                    <StartPublicRecipeButton recipeId={recipe.id} />
                  </div>}
                </div>
                <ExpandArrowButton
                  expanded={expandedRecipeId === recipe.id}
                  label={recipe.name || "recipe"}
                  controls={`public-recipe-${recipe.id}`}
                  onClick={() => toggleRecipe(recipe.id)}
                />
              </div>
              <div
                id={`public-recipe-${recipe.id}`}
                hidden={expandedRecipeId !== recipe.id}
              >
                <div className="border-t border-white/10 px-4 pb-5 pt-5 sm:px-5">
                  {loadingDetails[recipe.id] && <p role="status" className="text-sm text-white/65">Loading recipe details…</p>}
                  {detailErrors[recipe.id] && <div role="alert" className="rounded-lg border border-amber-300/30 bg-amber-300/5 p-3 text-sm text-amber-200">
                    <p>{detailErrors[recipe.id]}</p>
                    <button type="button" onClick={() => void loadDetails(recipe.id)} className="mt-2 min-h-11 underline">Try again</button>
                  </div>}
                  {details[recipe.id] && (
                    <RecipePresentation recipe={details[recipe.id]} linkTabIndex={expandedRecipeId === recipe.id ? undefined : -1} />
                  )}
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
      ) : !filterError ? (
        <p className="rounded-lg border border-white/10 bg-white/5 p-5 text-white/70">
          No recipes match these filters.
        </p>
      ) : null}
      {visibleCount < filteredRecipes.length && (
        <div className="mt-6 text-center">
          <button
            type="button"
            aria-controls="public-recipe-results"
            onClick={() => {
              const firstNewId = filteredRecipes[visibleCount]?.id;
              setVisibleCount(current => current + PUBLIC_RECIPE_PAGE_SIZE);
              requestAnimationFrame(() => {
                if (firstNewId) recipeItems.current.get(firstNewId)?.focus();
              });
            }}
            className="min-h-11 rounded-lg border border-green-400 bg-green-700 px-5 py-3 font-semibold hover:bg-green-600"
          >
            Load {Math.min(PUBLIC_RECIPE_PAGE_SIZE, filteredRecipes.length - visibleCount)} more recipes
          </button>
          <p className="mt-2 text-xs text-white/50">{filteredRecipes.length - visibleRecipes.length} more matching recipes</p>
        </div>
      )}
    </>
  );
}
