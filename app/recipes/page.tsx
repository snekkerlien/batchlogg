import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import PublicRecipeList from "./PublicRecipeList";
import type { RecipePresentationData } from "@/app/components/RecipePresentation";
import { countRecipeBrewers, searchableRecipeText, type PopularityBatch, type PublicRecipeSummary } from "@/lib/recipes/publicRecipes";
import { getOtherRecipeStyle } from "@/lib/recipes/otherRecipe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public Brewing Recipes",
  description:
    "Browse brewing recipes that Batchlogg members have chosen to share publicly.",
  alternates: { canonical: "/recipes" },
};

type PublicRecipe = RecipePresentationData & {
  id: string;
  user_id: string;
  created_at: string;
  copyright_free: boolean;
  source_recipe_id: string | null;
};

export default async function PublicRecipesPage() {
  const { serviceRole } = supabaseServer();
  const authors: { id: string; username: string }[] = [];
  const chunkSize = 500;
  for (let offset = 0; ; offset += chunkSize) {
    const { data, error } = await serviceRole
      .from("profiles")
      .select("id, username")
      .eq("is_public", true)
      .order("id")
      .range(offset, offset + chunkSize - 1);
    if (error) throw new Error(`Could not load public recipe authors: ${error.message}`);
    authors.push(...(data ?? []));
    if (!data || data.length < chunkSize) break;
  }

  const authorsById = new Map(
    authors.map((author) => [author.id, author.username])
  );
  const authorIds = [...authorsById.keys()];
  let publicRecipes: PublicRecipe[] = [];

  for (let authorOffset = 0; authorOffset < authorIds.length; authorOffset += 100) {
    const group = authorIds.slice(authorOffset, authorOffset + 100);
    for (let offset = 0; ; offset += chunkSize) {
      const { data: recipeRows, error: recipesError } = await serviceRole
        .from("recipes")
        .select(
          "id, user_id, source_recipe_id, name, type, abv, volume, ingredients, malts, hops, dry_hops, fruits, honey_type, juice_type, base_liquid, yeast, additives, created_at, copyright_free"
        )
        .eq("is_public", true)
        .in("user_id", group)
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + chunkSize - 1);

      if (recipesError) {
        throw new Error(`Could not load public recipes: ${recipesError.message}`);
      }
      publicRecipes.push(...((recipeRows ?? []) as PublicRecipe[]));
      if (!recipeRows || recipeRows.length < chunkSize) break;
    }
  }
  publicRecipes.sort((left, right) =>
    right.created_at.localeCompare(left.created_at) || left.id.localeCompare(right.id)
  );

  const popularityBatches: PopularityBatch[] = [];
  if (publicRecipes.length > 0) {
    for (let offset = 0; ; offset += chunkSize) {
      const { data, error } = await serviceRole.from("batches")
        .select("id, user_id, recipe_id, status, finished_date, recipe_snapshot")
        .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning", "finished", "avsluttet", "ferdig"])
        .order("id").range(offset, offset + chunkSize - 1);
      if (error) throw new Error(`Could not load recipe popularity: ${error.message}`);
      popularityBatches.push(...(data ?? []));
      if (!data || data.length < chunkSize) break;
    }
  }
  const recipeSources = new Map<string, string | null>(
    publicRecipes.map(recipe => [recipe.id, recipe.source_recipe_id])
  );
  const batchRecipeIds = [...new Set(popularityBatches.flatMap(batch =>
    batch.recipe_id && !recipeSources.has(batch.recipe_id) ? [batch.recipe_id] : []
  ))];
  for (let offset = 0; offset < batchRecipeIds.length; offset += 100) {
    const { data, error } = await serviceRole.from("recipes")
      .select("id, source_recipe_id").in("id", batchRecipeIds.slice(offset, offset + 100));
    if (error) throw new Error(`Could not load recipe popularity sources: ${error.message}`);
    for (const recipe of data ?? []) recipeSources.set(recipe.id, recipe.source_recipe_id);
  }
  const brewerCounts = countRecipeBrewers(
    popularityBatches, recipeSources, new Set(publicRecipes.map(recipe => recipe.id))
  );
  const publicRecipesById = new Map(publicRecipes.map(recipe => [recipe.id, recipe]));
  const summaries: PublicRecipeSummary[] = publicRecipes.flatMap(recipe => {
    const author = authorsById.get(recipe.user_id);
    if (!author) return [];
    const source = recipe.source_recipe_id ? publicRecipesById.get(recipe.source_recipe_id) : null;
    const sourceAuthor = source ? authorsById.get(source.user_id) : null;
    let category = recipe.type;
    if (recipe.type === "Other") category = getOtherRecipeStyle(recipe.ingredients) || recipe.type;
    if (recipe.type === "Beer" && recipe.ingredients && !Array.isArray(recipe.ingredients)) {
      category = recipe.ingredients.beer_style
        ? `Beer · ${recipe.ingredients.beer_style}`
        : "Beer";
    }
    return [{
      id: recipe.id,
      name: recipe.name || "Untitled recipe",
      type: recipe.type,
      abv: recipe.abv,
      volume: recipe.volume,
      author,
      category,
      created_at: recipe.created_at,
      copyright_free: recipe.copyright_free,
      brewerCount: brewerCounts.get(recipe.id) ?? 0,
      searchText: searchableRecipeText([
        recipe.name, author, recipe.type, recipe.ingredients, recipe.malts,
        recipe.hops, recipe.dry_hops, recipe.fruits, recipe.honey_type,
        recipe.juice_type, recipe.base_liquid, recipe.yeast, recipe.additives,
      ]).toLocaleLowerCase(),
      source: source && sourceAuthor
        ? { id: source.id, name: source.name || "Untitled recipe", author: sourceAuthor }
        : null,
    }];
  });

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto w-full max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 backdrop-blur-md sm:p-8">
        <PublicPageNavigation current="recipes" />
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-green-300">Public brewing recipes</h1>
          <p className="mt-3 text-white/75">
            Recipes shared publicly by Batchlogg members. Private recipes and
            recipes belonging to private profiles are not shown here.
          </p>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Expand a recipe to see its ingredients, fermentation guidance, and
            notes. Gravity, alcohol, and batch-volume figures are supplied as
            recipe data and may be estimates; verify measurements for your own
            brew. Sort by newest or most popular. Popularity counts unique
            brewers with active or finished batches; cancelled batches do not
            count. Use Load more to browse
            additional matches; filters search the entire public collection.
            {" "}Start a batch saves a private version to your library (or
            reuses your existing version), then lets you choose a vessel.
          </p>
        </header>

        <PublicRecipeList recipes={summaries} />
      </div>
    </main>
  );
}
