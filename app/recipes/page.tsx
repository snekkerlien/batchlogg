import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public Brewing Recipes",
  description:
    "Browse brewing recipes that Batchlogg members have chosen to share publicly.",
  alternates: { canonical: "/recipes" },
};

type PublicRecipe = {
  id: number;
  user_id: string;
  name: string;
  type: string;
  og: number | null;
  abv: number | null;
  volume: number | null;
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
      .select("id, user_id, name, type, og, abv, volume, created_at")
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
        <nav className="mb-8 flex flex-wrap gap-5 text-sm text-green-300">
          <Link href="/" className="underline">Batchlogg home</Link>
          <Link href="/abv-tools" className="underline">ABV tools</Link>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-green-300">Public brewing recipes</h1>
          <p className="mt-3 text-white/75">
            Recipes shared publicly by Batchlogg members. Private recipes and
            recipes belonging to private profiles are not shown here.
          </p>
        </header>

        {publicRecipes.length > 0 ? (
          <ul className="space-y-4">
            {publicRecipes.map((recipe) => {
              const username = authorsById.get(recipe.user_id);
              if (!username) return null;
              return (
                <li key={recipe.id}>
                  <Link
                    href={`/members/${encodeURIComponent(username)}/recipes/${recipe.id}`}
                    className="block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
                  >
                    <h2 className="text-xl font-semibold">{recipe.name}</h2>
                    <p className="mt-1 text-sm text-white/65">
                      {recipe.type} · by {username}
                    </p>
                    <p className="mt-3 text-sm text-white/75">
                      {recipe.og != null && <>OG {Number(recipe.og).toFixed(3)} · </>}
                      {recipe.abv != null && <>ABV {Number(recipe.abv).toFixed(1)}% · </>}
                      {recipe.volume != null && <>Volume {recipe.volume} L</>}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-lg border border-white/10 bg-white/5 p-5 text-white/70">
            No public recipes are available yet. Members can choose which
            recipes to share from their recipe library.
          </p>
        )}
      </div>
    </main>
  );
}
