"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import Link from "next/link";

export default function RecipesPage() {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) {
        window.location.href = "/auth/login";
        return;
      }

      const { data: recipesRaw } = await supabaseBrowser
        .from("recipes")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setRecipes(recipesRaw ?? []);
      setLoading(false);
    }

    load();
  }, []);

  async function togglePublic(id: string, current: boolean) {
    await supabaseBrowser
      .from("recipes")
      .update({ is_public: !current })
      .eq("id", id);

    setRecipes((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, is_public: !current } : r
      )
    );
  }

  function toggle(id: string) {
    setExpanded(expanded === id ? null : id);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative pt-16 sm:pt-0">

        {/* TOP BAR */}
        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center">
          My recipes
        </h1>

        <p className="opacity-80 text-center mb-10">
          Recipes saved from finished batches.
        </p>

        <div className="space-y-4">
          {recipes.length > 0 ? (
            recipes.map((r) => (
              <div
                key={r.id}
                className="bg-white/10 border border-white/20 rounded-xl p-4"
              >
                {/* CLICKABLE HEADER */}
                <button
                  onClick={() => toggle(r.id)}
                  className="w-full flex justify-between items-center text-left"
                >
                  <span className="text-xl font-bold text-green-300">
                    {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                  </span>

                  <div className="flex items-center gap-3">

                    {/* PUBLIC / PRIVATE TOGGLE */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePublic(r.id, r.is_public);
                      }}
                      className={`px-4 py-2 rounded-lg font-semibold border ${
                        r.is_public
                          ? "bg-green-600 hover:bg-green-700 border-green-400"
                          : "bg-zinc-700 hover:bg-zinc-600 border-zinc-500"
                      }`}
                    >
                      {r.is_public ? "Public" : "Private"}
                    </button>

                    {/* ARROW */}
                    <span
                      className={`text-white text-2xl transition-transform duration-200 ${
                        expanded === r.id ? "rotate-90" : "rotate-180"
                      }`}
                    >
                      ▶
                    </span>
                  </div>
                </button>

                {/* SLIDER CONTENT */}
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    expanded === r.id ? "max-h-[2000px] mt-4" : "max-h-0"
                  }`}
                >
                  <div className="space-y-3 opacity-90">

                    {/* STATS */}
                    <p className="text-sm">
                      <strong>OG:</strong> {Number(r.og).toFixed(3)}
                      <strong className="ml-4">FG:</strong> {Number(r.fg).toFixed(3)}
                      <strong className="ml-4">ABV:</strong> {r.abv.toFixed(1)}%
                    </p>

                    <p className="text-sm">
                      <strong>Volume:</strong> {r.volume} L
                    </p>

                    {/* INGREDIENTS */}
                    {r.ingredients && (
                      <p className="whitespace-pre-line">
                        <strong>Ingredients:</strong>{"\n"}
                        {r.ingredients}
                      </p>
                    )}

                    {/* METHOD */}
                    {r.method && (
                      <p className="whitespace-pre-line">
                        <strong>Method:</strong>{"\n"}
                        {r.method}
                      </p>
                    )}

                    {/* NOTES */}
                    {r.notes && (
                      <p className="whitespace-pre-line">
                        <strong>Notes:</strong>{"\n"}
                        {r.notes}
                      </p>
                    )}

                    {/* NOTES LOG (batch notes) */}
                    {r.notes_log && r.notes_log.length > 0 && (
                      <div className="whitespace-pre-line">
                        <strong>Note log:</strong>
                        {"\n"}
                        {r.notes_log.map((n: any) => `• ${n.note}`).join("\n")}
                      </div>
                    )}

                    {/* NOTE LOG BUTTON */}
                    <div className="flex justify-end pt-4">
                      <Link
                        href={`/recipes/${r.id}`}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
                      >
                        Open note log →
                      </Link>
                    </div>

                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="opacity-60 text-center">No recipes found.</p>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg - Batchlogg
        </p>
      </div>
    </main>
  );
}
