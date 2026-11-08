"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import RecipePresentation, { type RecipePresentationData } from "@/app/components/RecipePresentation";
import ExpandArrowButton from "@/app/components/ExpandArrowButton";
import { Qty } from "@/app/components/Units";
import StartPublicRecipeButton from "@/app/components/StartPublicRecipeButton";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useAuthContext } from "@/app/providers/AuthProvider";
import { translateRecipeError } from "@/lib/i18n/apiErrors";
import { useTranslation } from "@/lib/i18n/useTranslation";
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
  canModerateRecipes,
}: {
  recipes: PublicRecipeSummary[];
  canModerateRecipes: boolean;
}) {
  const { t, language } = useTranslation();
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
  const [recipeManageOpen, setRecipeManageOpen] = useState<string | null>(null);
  const [removedRecipeIds, setRemovedRecipeIds] = useState<Set<string>>(() => new Set());
  const [recipePendingRemoval, setRecipePendingRemoval] =
    useState<PublicRecipeSummary | null>(null);
  const [removingRecipeId, setRemovingRecipeId] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState("");
  const [moderationNotice, setModerationNotice] = useState("");
  const [visibleCount, setVisibleCount] = useState(PUBLIC_RECIPE_PAGE_SIZE);
  const [details, setDetails] = useState<Record<string, RecipePresentationData>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const pendingDetails = useRef(new Set<string>());
  const recipeItems = useRef(new Map<string, HTMLLIElement>());
  const availableRecipes = useMemo(
    () => recipes.filter((recipe) => !removedRecipeIds.has(recipe.id)),
    [recipes, removedRecipeIds]
  );
  const types = useMemo(
    () => [...new Set(availableRecipes.map((recipe) => recipe.type).filter(Boolean))].sort(),
    [availableRecipes]
  );
  const filters = { search, type, minimumAbv, maximumAbv };
  const filterError = publicRecipeFilterError(filters);
  const filteredRecipes = useMemo(
    () => sortPublicRecipes(filterPublicRecipes(availableRecipes, { search, type, minimumAbv, maximumAbv }), sort),
    [availableRecipes, search, type, minimumAbv, maximumAbv, sort]
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
        throw new Error(result.error || t("Could not load recipe details. Please try again."));
      }
      const recipe = result.recipe;
      setDetails(current => ({ ...current, [id]: recipe }));
    } catch (error) {
      console.error("Could not load public recipe details", error);
      const errorMessage =
        error instanceof Error && !(error instanceof TypeError)
          ? error.message
          : "Could not load recipe details. Please try again.";
      setDetailErrors(current => ({
        ...current,
        [id]: translateRecipeError(errorMessage, t),
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

  async function removeRecipeFromPublicListing() {
    if (!recipePendingRemoval || removingRecipeId) return false;
    const recipe = recipePendingRemoval;
    setRemovingRecipeId(recipe.id);
    setModerationError("");
    setModerationNotice("");
    try {
      const response = await fetch(
        `/api/admin/public-recipes/${encodeURIComponent(recipe.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const result: { error?: string; warning?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not remove this recipe from public listings.");
      }
      setRemovedRecipeIds((current) => new Set(current).add(recipe.id));
      setExpandedRecipeId((current) => current === recipe.id ? null : current);
      setRecipeManageOpen((current) => current === recipe.id ? null : current);
      setModerationNotice(
        result.warning || `${recipe.name} was removed from public recipes. The owner's saved recipe remains unchanged.`
      );
      return true;
    } catch (error) {
      console.error("Could not remove public recipe", error);
      setModerationError(
        error instanceof Error
          ? error.message
          : "Could not remove this recipe from public listings."
      );
      return false;
    } finally {
      setRemovingRecipeId(null);
    }
  }

  if (!recipes.length) {
    return (
      <p className="rounded-lg border border-white/10 bg-white/5 p-5 text-white/70">
        {t("No public recipes are available yet. Members can choose which recipes to share from their recipe library.")}
      </p>
    );
  }

  return (
    <>
      {!authLoading && user && requestedStart && recipes.some(recipe => recipe.id === requestedStart) && (
        <section
          aria-label={t("Continue starting your batch")}
          className="mb-5 rounded-lg border border-green-400/30 bg-green-400/5 p-4"
        >
          <p className="mb-3 text-sm">
            {t("Continue with {name}. Choose an empty vessel on the next screen.").replace(
              "{name}",
              recipes.find(recipe => recipe.id === requestedStart)?.name ?? ""
            )}
          </p>
          <StartPublicRecipeButton recipeId={requestedStart} />
        </section>
      )}
      <section
        aria-label={t("Filter public recipes")}
        className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2"
      >
        <label className="sm:col-span-2">
          <span className="sr-only">{t("Search recipes and ingredients")}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); resetVisibleRecipes(); }}
            placeholder={t("Search recipes, brewers, or ingredients")}
            className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("Recipe type")}
          <select
            value={type}
            onChange={(event) => { setType(event.target.value); resetVisibleRecipes(); }}
            className="rounded-lg border border-white/20 bg-black/40 p-3"
          >
            <option value="All types">{t("All types")}</option>
            {types.map((recipeType) => (
              <option key={recipeType}>{recipeType}</option>
            ))}
          </select>
        </label>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-sm">{t("ABV range (%)")}</legend>
          <label>
            <span className="sr-only">{t("Minimum ABV")}</span>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={minimumAbv}
              onChange={(event) => { setMinimumAbv(event.target.value); resetVisibleRecipes(); }}
              placeholder={t("Min")}
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            />
          </label>
          <label>
            <span className="sr-only">{t("Maximum ABV")}</span>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={maximumAbv}
              onChange={(event) => { setMaximumAbv(event.target.value); resetVisibleRecipes(); }}
              placeholder={t("Max")}
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            />
          </label>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          {t("Sort recipes")}
          <select
            value={sort}
            onChange={event => {
              setSort(event.target.value === "popular" ? "popular" : "newest");
              resetVisibleRecipes();
            }}
            className="rounded-lg border border-white/20 bg-black/40 p-3"
          >
            <option value="newest">{t("Newest first")}</option>
            <option value="popular">{t("Most popular")}</option>
          </select>
        </label>
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p role="status" aria-live="polite" aria-atomic="true" className="text-white/65">
          {filterError
            ? t(filterError)
            : t(
                `Showing {visible} of {total} ${hasFilters ? "matching " : ""}${filteredRecipes.length === 1 ? "recipe" : "recipes"}`
              )
                .replace("{visible}", String(visibleRecipes.length))
                .replace("{total}", String(filteredRecipes.length))}
          {hasFilters && !filterError && (
            <span className="text-white/65">
              {t(" · {count} public in total").replace("{count}", String(recipes.length))}
            </span>
          )}
          {!filterError && <span className="text-white/45"> · {t(sort === "popular" ? "Most popular" : "Newest first")}</span>}
        </p>
        {hasFilters && <button type="button" onClick={clearFilters} className="min-h-11 rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
          {t("Clear filters")}
        </button>}
      </div>
      {filterError && (
        <p role="alert" className="mb-4 text-sm text-amber-200">
          {t(filterError)}
        </p>
      )}
      {moderationNotice && (
        <p role="status" className="mb-4 text-sm text-green-200">{moderationNotice}</p>
      )}
      {moderationError && (
        <p role="alert" className="mb-4 text-sm text-amber-200">{moderationError}</p>
      )}

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
                    {recipe.category} <span aria-hidden="true">·</span> {t("by")}{" "}
                    <Link href={`/members/${encodeURIComponent(recipe.author)}`} className="text-green-200 underline underline-offset-2">{recipe.author}</Link>
                  </p>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/70">
                    <span>{recipe.abv != null && recipe.abv !== "" && Number.isFinite(Number(recipe.abv)) ? `${Number(recipe.abv).toFixed(1)}% ABV` : t("ABV not provided")}</span>
                    <span>{recipe.volume != null && recipe.volume !== "" && Number.isFinite(Number(recipe.volume)) ? <>{t("Batch:")} <Qty kind="volume" value={recipe.volume} /></> : t("Volume not provided")}</span>
                    <span>{recipe.created_at ? t("Created {date}").replace("{date}", new Date(recipe.created_at).toLocaleDateString(language === "nb" ? "nb-NO" : "en-GB")) : t("date unavailable")}</span>
                    <span title={t("Unique brewers with active or finished batches. Cancelled batches do not count.")}>
                      {t(recipe.brewerCount === 1 ? "Brewed by {count} brewer" : "Brewed by {count} brewers").replace("{count}", String(recipe.brewerCount))}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-white/55">
                    {t(recipe.copyright_free ? "Marked copyright-free by {author}" : "Copyright belongs to {author}").replace("{author}", recipe.author)}
                  </p>
                  {recipe.source && (
                    <p className="mt-2 text-sm text-white/65">
                      {t("A version of")}{" "}
                      <Link
                        href={`/members/${encodeURIComponent(recipe.source.author)}/recipes/${recipe.source.id}`}
                        className="text-green-200 underline"
                      >
                        {recipe.source.name}
                      </Link>
                      {" "}{t("by")}{" "}
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
                  expandedAriaLabel={t("Collapse {name}").replace("{name}", recipe.name || t("recipe"))}
                  collapsedAriaLabel={t("Expand {name}").replace("{name}", recipe.name || t("recipe"))}
                  controls={`public-recipe-${recipe.id}`}
                  onClick={() => toggleRecipe(recipe.id)}
                />
              </div>
              <div
                id={`public-recipe-${recipe.id}`}
                hidden={expandedRecipeId !== recipe.id}
              >
                <div className="border-t border-white/10 px-4 pb-5 pt-5 sm:px-5">
                  {canModerateRecipes && (
                    <div className="mb-4 rounded-lg border border-white/10 bg-black/20">
                      <button
                        type="button"
                        aria-expanded={recipeManageOpen === recipe.id}
                        aria-controls={`public-recipe-manage-${recipe.id}`}
                        onClick={() =>
                          setRecipeManageOpen((current) =>
                            current === recipe.id ? null : recipe.id
                          )
                        }
                        className="w-full cursor-pointer px-4 py-3 text-left text-sm font-semibold text-white/75 hover:text-white"
                      >
                        {t("Manage recipe")}
                        <span aria-hidden="true" className="float-right text-white/60">
                          {recipeManageOpen === recipe.id ? "−" : "+"}
                        </span>
                      </button>
                      {recipeManageOpen === recipe.id && (
                        <div
                          id={`public-recipe-manage-${recipe.id}`}
                          className="border-t border-white/10 p-4"
                        >
                          <p className="mb-3 text-sm text-white/65">
                            {t("Remove this recipe from public listings without deleting the owner’s saved recipe.")}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setModerationError("");
                              setRecipePendingRemoval(recipe);
                            }}
                            className="min-h-10 rounded-lg border border-red-300/25 bg-red-400/5 px-3 py-2 text-sm font-medium text-red-100/85 hover:bg-red-400/10 hover:text-red-100"
                          >
                            {t("Remove from public")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {loadingDetails[recipe.id] && <p role="status" className="text-sm text-white/65">{t("Loading recipe details…")}</p>}
                  {detailErrors[recipe.id] && <div role="alert" className="rounded-lg border border-amber-300/30 bg-amber-300/5 p-3 text-sm text-amber-200">
                    <p>{detailErrors[recipe.id]}</p>
                    <button type="button" onClick={() => void loadDetails(recipe.id)} className="mt-2 min-h-11 underline">{t("Try again")}</button>
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
                      {t("Open standalone recipe")}
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : !filterError ? (
        <p className="rounded-lg border border-white/10 bg-white/5 p-5 text-white/70">
          {t("No recipes match these filters.")}
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
            {t("Load {count} more recipes").replace(
              "{count}",
              String(Math.min(PUBLIC_RECIPE_PAGE_SIZE, filteredRecipes.length - visibleCount))
            )}
          </button>
          <p className="mt-2 text-xs text-white/50">
            {t("{count} more matching recipes").replace(
              "{count}",
              String(filteredRecipes.length - visibleRecipes.length)
            )}
          </p>
        </div>
      )}
      <ConfirmDialog
        open={recipePendingRemoval !== null}
        title={t("Remove public recipe?")}
        message={
          recipePendingRemoval
            ? t('Remove "{name}" from public listings? The author’s saved recipe will not be deleted.').replace(
                "{name}",
                String(recipePendingRemoval.name)
              )
            : ""
        }
        confirmLabel={t("Remove from public")}
        onConfirm={removeRecipeFromPublicListing}
        onCancel={() => {
          setRecipePendingRemoval(null);
          setModerationError("");
        }}
      />
    </>
  );
}
