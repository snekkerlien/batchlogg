import type { RecipePresentationData } from "@/app/components/RecipePresentation";

export const PUBLIC_RECIPE_DETAILS =
  "id, user_id, source_recipe_id, name, type, og, fg, abv, volume, ibu, ebc, ingredients, malts, hops, dry_hops, boil_volume, boil_time, yeast, honey_type, honey_amount, base_liquid, base_liquid_amount, fruits, juice_type, sugar_amount, steps, additives, full_process, notes, had_secondary, secondary_additions, secondary_notes, created_at, copyright_free";

export type PublicRecipeSummary = Pick<
  RecipePresentationData,
  "name" | "type" | "abv" | "volume"
> & {
  id: string;
  created_at: string;
  copyright_free: boolean;
  author: string;
  category: string;
  searchText: string;
  brewerCount: number;
  source: { id: string; name: string; author: string } | null;
};

export const PUBLIC_RECIPE_PAGE_SIZE = 12;

export type PublicRecipeSort = "newest" | "popular";

export function sortPublicRecipes(recipes: PublicRecipeSummary[], sort: PublicRecipeSort) {
  return [...recipes].sort((left, right) =>
    (sort === "popular" ? right.brewerCount - left.brewerCount : 0) ||
    right.created_at.localeCompare(left.created_at) ||
    left.id.localeCompare(right.id)
  );
}

export type PopularityBatch = {
  user_id: string;
  recipe_id: string | null;
  status: string;
  finished_date: string | null;
  recipe_snapshot: { recipe_id?: string; source_recipe_id?: string | null } | null;
};

export function countRecipeBrewers(
  batches: PopularityBatch[],
  sources: Map<string, string | null>,
  publicIds: Set<string>
) {
  const brewers = new Map<string, Set<string>>();
  for (const batch of batches) {
    const status = batch.status.toLowerCase();
    const active = ["aktiv", "sekundær", "secondary", "conditioning"].includes(status);
    const finished = ["finished", "avsluttet", "ferdig"].includes(status) && Boolean(batch.finished_date);
    if (!active && !finished) continue;
    const recipeId = batch.recipe_snapshot?.recipe_id ?? batch.recipe_id;
    const sourceId = batch.recipe_snapshot?.source_recipe_id ??
      (recipeId ? sources.get(recipeId) : null);
    for (const id of new Set([recipeId, sourceId])) {
      if (!id || !publicIds.has(id)) continue;
      const users = brewers.get(id) ?? new Set<string>();
      users.add(batch.user_id);
      brewers.set(id, users);
    }
  }
  return new Map([...brewers].map(([id, users]) => [id, users.size]));
}

export type PublicRecipeFilters = {
  search: string;
  type: string;
  minimumAbv: string;
  maximumAbv: string;
};

export function publicRecipeFilterError({ minimumAbv, maximumAbv }: PublicRecipeFilters): string | null {
  if ([minimumAbv, maximumAbv].some(value =>
    value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)
  )) return "ABV values must be between 0 and 100%.";
  if (minimumAbv !== "" && maximumAbv !== "" && Number(minimumAbv) > Number(maximumAbv)) {
    return "Minimum ABV cannot be greater than maximum ABV.";
  }
  return null;
}

export function filterPublicRecipes(recipes: PublicRecipeSummary[], filters: PublicRecipeFilters) {
  if (publicRecipeFilterError(filters)) return [];
  const query = filters.search.trim().toLocaleLowerCase();
  return recipes.filter(recipe => {
    const abv = recipe.abv == null || recipe.abv === "" ? null : Number(recipe.abv);
    return (!query || recipe.searchText.includes(query)) &&
      (filters.type === "All types" || recipe.type === filters.type) &&
      (filters.minimumAbv === "" || (abv !== null && abv >= Number(filters.minimumAbv))) &&
      (filters.maximumAbv === "" || (abv !== null && abv <= Number(filters.maximumAbv)));
  });
}

export function searchableRecipeText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(searchableRecipeText).join(" ");
  if (typeof value === "object" && value !== null) {
    return Object.values(value).map(searchableRecipeText).join(" ");
  }
  return "";
}
