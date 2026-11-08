"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { RECIPE_TYPES } from "@/lib/recipes/recipeTypes";

export type RecipeSort = "newest" | "oldest" | "name" | "style";

export default function RecipeFilters({
  type,
  onTypeChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
}: {
  type: string;
  onTypeChange: (type: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: RecipeSort;
  onSortChange: (sort: RecipeSort) => void;
}) {
  const { t } = useTranslation();

  return (
    <section aria-label={t("Filter recipes")} className="mx-auto mb-6 max-w-full space-y-3 sm:w-fit">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("Search recipes")}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("Search recipes")}
            className="w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm"
          />
        </label>
        <label>
          <span className="sr-only">{t("Sort recipes")}</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as RecipeSort)}
            className="w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm sm:w-auto"
          >
            <option value="newest">{t("Newest first")}</option>
            <option value="oldest">{t("Oldest first")}</option>
            <option value="name">{t("Name A–Z")}</option>
            {type === "Beer" && <option value="style">{t("Style A–Z")}</option>}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center">
        {["All", ...RECIPE_TYPES].map((recipeType) => (
          <button
            key={recipeType}
            type="button"
            onClick={() => onTypeChange(recipeType)}
            aria-pressed={type === recipeType}
            className={`rounded-lg border px-2 py-2 text-center text-sm sm:px-3 ${
              type === recipeType
                ? "border-green-500 bg-green-700"
                : "border-white/20 bg-white/10 hover:bg-white/20"
            }`}
          >
            {t(recipeType)}
          </button>
        ))}
      </div>
    </section>
  );
}
