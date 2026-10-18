"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import MenuOverlay from "../MenuOverlay";
import BackButton from "../BackButton";
import { useRouter } from "next/navigation";
import PageHeading from "@/app/components/PageHeading";
import RecipeDetailsContent from "../RecipeDetailsContent";

export default function RecipeNotesPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      const { data: recipeData } = await supabaseBrowser
        .from("recipes")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", session.user.id)
        .single();

      setRecipe(recipeData ?? null);
      setLoading(false);
    }

    load();
  }, [params.id, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        Loading recipe…
      </main>
    );
  }

  if (!recipe) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Recipe not found</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto w-full max-w-4xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-8">
        <div className="absolute left-4 top-3"><BackButton /></div>
        <div className="absolute right-4 top-3"><MenuOverlay /></div>

        <PageHeading
          title={recipe.name.charAt(0).toUpperCase() + recipe.name.slice(1)}
          subtitle="Full recipe details and brewer’s notes."
        />

        <div className="mb-6 flex flex-wrap justify-center gap-4 text-sm">
          <Link
            href={`/my-recipes/${encodeURIComponent(recipe.id)}/versions`}
            className="font-semibold text-amber-200 underline"
          >
            Recipe history and comparison
          </Link>
          <a
            href={`/api/recipes/${encodeURIComponent(recipe.id)}/export?format=json`}
            className="text-amber-200 underline"
          >
            Export JSON
          </a>
          <a
            href={`/api/recipes/${encodeURIComponent(recipe.id)}/export?format=csv`}
            className="text-amber-200 underline"
          >
            Export CSV
          </a>
        </div>

        <RecipeDetailsContent recipe={recipe} />
      </div>
    </main>
  );
}
