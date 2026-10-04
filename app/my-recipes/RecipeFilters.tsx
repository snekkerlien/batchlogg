"use client";

const RECIPE_TYPES = ["All", "Mead", "Beer", "Cider", "Wine", "Seltzer", "Braggot", "Other"];

export type RecipeSort = "newest" | "oldest" | "name";

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
  return (
    <section aria-label="Filter recipes" className="mx-auto mb-6 max-w-full space-y-3 sm:w-fit">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search recipes</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search recipes"
            className="w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm"
          />
        </label>
        <label>
          <span className="sr-only">Sort recipes</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as RecipeSort)}
            className="w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm sm:w-auto"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible">
        {RECIPE_TYPES.map((recipeType) => (
          <button
            key={recipeType}
            type="button"
            onClick={() => onTypeChange(recipeType)}
            aria-pressed={type === recipeType}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${
              type === recipeType
                ? "border-green-500 bg-green-700"
                : "border-white/20 bg-white/10 hover:bg-white/20"
            }`}
          >
            {recipeType}
          </button>
        ))}
      </div>
    </section>
  );
}
