"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import MenuOverlay from "../MenuOverlay";
import BackButton from "../BackButton";
import { useRouter } from "next/navigation";

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

  const notes = recipe.notes_log || [];

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-6">
          <BackButton />
          <MenuOverlay />
        </div>

        {/* Header */}
        <h1 className="text-4xl font-bold mb-6 text-center text-green-300">
          {recipe.name.charAt(0).toUpperCase() + recipe.name.slice(1)}
        </h1>

        <p className="opacity-80 text-center mb-10">
          Full recipe details and brewer's notes.
        </p>

        {/* Recipe info */}
        <div className="space-y-6">

          {/* Base values */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h2 className="text-2xl font-semibold mb-3">Base values</h2>

            <p className="text-lg">
              <strong>OG:</strong> {Number(recipe.og).toFixed(3)}
            </p>

            <p className="text-lg mt-2">
              <strong>FG:</strong> {Number(recipe.fg).toFixed(3)}
            </p>

            <p className="text-lg mt-2">
              <strong>ABV:</strong> {recipe.abv.toFixed(1)}%
            </p>

            <p className="text-lg mt-2">
              <strong>Volume:</strong> {recipe.volume} L
            </p>
          </div>

          {/* Ingredients */}
          {recipe.ingredients && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl whitespace-pre-line">
              <h2 className="text-2xl font-semibold mb-3">Ingredients</h2>
              {recipe.ingredients}
            </div>
          )}

          {/* Method */}
          {recipe.method && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl whitespace-pre-line">
              <h2 className="text-2xl font-semibold mb-3">Method</h2>
              {recipe.method}
            </div>
          )}

          {/* Notes */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl whitespace-pre-line">
            <h2 className="text-2xl font-semibold mb-3">Notes</h2>
            {recipe.notes || "No notes added"}
          </div>

        </div>

        {/* NOTE LOG */}
        <h2 className="text-2xl font-semibold mt-12 mb-4 text-center">
          Notes
        </h2>

        <div className="space-y-4">
          {notes && notes.length > 0 ? (
            notes.map((n: any) => (
              <div
                key={n.id}
                className="p-4 bg-white/10 border border-white/20 rounded-xl"
              >
                {/* Date */}
                <p className="text-sm opacity-60">
                  {new Date(n.created_at).toLocaleDateString("en-GB")}
                </p>

                {/* Image */}
                {n.note_type === "image" && n.image_url && (
                  <img
                    src={n.image_url}
                    alt="Note image"
                    className="rounded-lg mt-3"
                  />
                )}

                {/* Text */}
                {n.note && (
                  <p className="mt-3 whitespace-pre-line">
                    {n.note}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="opacity-60 text-center">No notes yet.</p>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>
    </main>
  );
}
