import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import PublicRecipeList from "./PublicRecipeList";
import type { RecipePresentationData } from "@/app/components/RecipePresentation";

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
};

export default async function PublicRecipesPage() {
  const { serviceRole } = supabaseServer();
  const { data: authors, error: authorsError } = await serviceRole
    .from("profiles")
    .select("id, username")
    .eq("is_public", true)
    .limit(1000);

  if (authorsError) {
    throw new Error(`Could not load public recipe authors: ${authorsError.message}`);
  }

  const authorsById = new Map(
    (authors ?? []).map((author) => [author.id, author.username])
  );
  const authorIds = [...authorsById.keys()];
  let publicRecipes: PublicRecipe[] = [];

  if (authorIds.length > 0) {
    const { data: recipeRows, error: recipesError } = await serviceRole
      .from("recipes")
      .select(
        "id, user_id, name, type, og, fg, abv, volume, ibu, ebc, ingredients, malts, hops, dry_hops, boil_volume, boil_time, yeast, honey_type, honey_amount, base_liquid, base_liquid_amount, fruits, juice_type, sugar_amount, steps, additives, full_process, notes, had_secondary, secondary_additions, secondary_notes, created_at"
      )
      .eq("is_public", true)
      .in("user_id", authorIds)
      .order("created_at", { ascending: false })
      .limit(100);

    if (recipesError) {
      throw new Error(`Could not load public recipes: ${recipesError.message}`);
    }
    publicRecipes = (recipeRows ?? []) as PublicRecipe[];
  }

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
            brew.
          </p>
        </header>

        <PublicRecipeList
          recipes={publicRecipes.flatMap((recipe) => {
            const author = authorsById.get(recipe.user_id);
            return author ? [{ ...recipe, author }] : [];
          })}
        />
      </div>
    </main>
  );
}
