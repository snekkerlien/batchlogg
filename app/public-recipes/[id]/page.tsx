import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PageHeading from "@/app/components/PageHeading";
import RecipePresentation from "@/app/components/RecipePresentation";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import { PUBLIC_RECIPE_DETAILS } from "@/lib/recipes/publicRecipes";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicMentionedRecipePage({
  params,
}: {
  params: { id: string };
}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    notFound();
  }

  const { supabase, serviceRole } = supabaseServer();
  const { data: recipe, error: recipeError } = await serviceRole
    .from("recipes")
    .select(`${PUBLIC_RECIPE_DETAILS}, is_public`)
    .eq("id", params.id)
    .maybeSingle();
  if (recipeError) throw new Error(`Could not load public recipe: ${recipeError.message}`);
  if (!recipe) notFound();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError && userError.name !== "AuthSessionMissingError") {
    throw new Error(`Could not verify the current user: ${userError.message}`);
  }
  if (!recipe.is_public) {
    redirect(user?.id === recipe.user_id ? `/my-recipes/${recipe.id}` : "/recipes");
  }

  const { data: profile, error: profileError } = await serviceRole
    .from("profiles")
    .select("username")
    .eq("id", recipe.user_id)
    .eq("is_public", true)
    .maybeSingle();
  if (profileError) throw new Error(`Could not load public recipe author: ${profileError.message}`);
  if (!profile) {
    redirect(user?.id === recipe.user_id ? `/my-recipes/${recipe.id}` : "/recipes");
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto w-full max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 backdrop-blur-md sm:p-8">
        <PublicPageNavigation current="recipes" />
        <PageHeading title={recipe.name || "Public recipe"} subtitle={`Shared by ${profile.username}`} />
        <RecipePresentation recipe={recipe} />
        <p className="mt-6 text-center">
          <Link
            href={`/members/${encodeURIComponent(profile.username)}/recipes/${encodeURIComponent(recipe.id)}`}
            className="text-green-300 underline"
          >
            View recipe and brewer notes
          </Link>
        </p>
      </div>
    </main>
  );
}
