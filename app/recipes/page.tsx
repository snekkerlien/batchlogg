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

  // ⭐ NEW: delete confirmation modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  async function deleteRecipe(id: string) {
    const res = await fetch("/api/recipes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
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

        <h1 className="text-4xl font-bold mb-6 text-center mt-6">
          My recipes
        </h1>

        <p className="opacity-80 text-center mb-10">
          Recipes saved from finished batches.
        </p>

        <div className="space-y-4">
          {recipes.length > 0 ? (
            recipes.map((r) => {
              const og = r.og ? Number(r.og).toFixed(3) : "—";
              const fg = r.fg ? Number(r.fg).toFixed(3) : "—";
              const abv = r.abv ? Number(r.abv).toFixed(1) : "—";
              const volume = r.volume ?? "—";

              return (
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
                      {r.name
                        ? r.name.charAt(0).toUpperCase() + r.name.slice(1)
                        : "Unnamed recipe"}
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

                      {/* DELETE BUTTON — NOW OPENS CONFIRMATION */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(r.id);
                        }}
                        className="px-4 py-2 rounded-lg font-semibold border bg-red-700 hover:bg-red-600 border-red-500"
                      >
                        Delete
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

                      <p className="text-sm">
                        <strong>OG:</strong> {og}
                        <strong className="ml-4">FG:</strong> {fg}
                        <strong className="ml-4">ABV:</strong> {abv}%
                      </p>

                      <p className="text-sm">
                        <strong>Volume:</strong> {volume} L
                      </p>

                      {r.ingredients && (
                        <p className="whitespace-pre-line">
                          <strong>Ingredients:</strong>{"\n"}
                          {r.ingredients}
                        </p>
                      )}

                      {r.method && (
                        <p className="whitespace-pre-line">
                          <strong>Full Process:</strong>{"\n"}
                          {r.method}
                        </p>
                      )}

                      {r.notes && (
                        <p className="whitespace-pre-line">
                          <strong>Recipe notes:</strong>{"\n"}
                          {r.notes}
                        </p>
                      )}

                      {r.notes_log && r.notes_log.length > 0 && (
                        <div className="whitespace-pre-line">
                          <strong>Note log:</strong>
                          {"\n"}
                          {r.notes_log.map((n: any) => `• ${n.note}`).join("\n")}
                        </div>
                      )}

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
              );
            })
          ) : (
            <p className="opacity-60 text-center">No recipes found.</p>
          )}
        </div>

        {/* ⭐ CONFIRM DELETE MODAL */}
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-white/20 p-6 rounded-xl w-full max-w-sm text-white">
              <h2 className="text-xl font-bold mb-4">Delete recipe?</h2>

              <p className="opacity-80 mb-6">
                Are you sure you want to delete this recipe? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-500 rounded-lg font-semibold"
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    await deleteRecipe(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 border border-red-500 rounded-lg font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>
    </main>
  );
}
