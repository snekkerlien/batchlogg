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
  const [openStyleSelect, setOpenStyleSelect] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ⭐ NEW: filter state
  const [filterType, setFilterType] = useState<string>("All");

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
    await supabaseBrowser.from("recipes").update({ is_public: !current }).eq("id", id);

    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_public: !current } : r))
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

  const filteredRecipes =
    filterType === "All"
      ? recipes
      : recipes.filter((r) => r.type?.toLowerCase() === filterType.toLowerCase());

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
          Loading recipes…
        </div>
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

        <h1 className="text-4xl font-bold mb-6 text-center mt-6">My recipes</h1>
        <p className="opacity-80 text-center mb-10">All your recipes in one place.</p>

        {/* NEW RECIPE BUTTON */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setOpenStyleSelect(true)}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            New recipe
          </button>
        </div>

        {/* ⭐ FILTER BAR */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {["All", "Mead", "Beer", "Cider", "Wine", "Seltzer", "Braggot", "Other"].map(
            (t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  filterType === t
                    ? "bg-green-700 border-green-500"
                    : "bg-white/10 border-white/20 hover:bg-white/20"
                }`}
              >
                {t}
              </button>
            )
          )}
        </div>

        {/* RECIPE LIST */}
        <div className="space-y-4">
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map((r) => {
              const og = r.og ? Number(r.og).toFixed(3) : "—";
              const fg = r.fg ? Number(r.fg).toFixed(3) : "—";
              const abv = r.abv ? Number(r.abv).toFixed(1) : "—";
              const volume = r.volume ?? "—";

              return (
                <div key={r.id} className="bg-white/10 border border-white/20 rounded-xl p-4">
                  {/* CLICKABLE HEADER */}
                  <button
                    onClick={() => toggle(r.id)}
                    className="w-full flex justify-between items-center text-left"
                  >
                    <span className="text-xl font-bold text-green-300">
                      {r.name ? r.name.charAt(0).toUpperCase() + r.name.slice(1) : "Unnamed recipe"}
                    </span>

                    <div className="flex items-center gap-3">
                      {/* PUBLIC / PRIVATE */}
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

                      {/* DELETE */}
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

                      {/* ⭐ TYPE-SPECIFIC FIELDS */}
                      {r.type === "Mead" && (
                        <>
                          {r.honey_type && (
                            <p>
                              <strong>Honey type:</strong> {r.honey_type}
                            </p>
                          )}
                          {r.honey_amount && (
                            <p>
                              <strong>Honey amount:</strong> {r.honey_amount} kg
                            </p>
                          )}
                          {r.fruits && r.fruits.length > 0 && (
                            <div>
                              <strong>Fruits:</strong>
                              <ul className="list-disc ml-6 opacity-80">
                                {r.fruits.map((f: any, i: number) => (
                                  <li key={i}>
                                    {f.name} — {f.amount} {f.unit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}

                      {r.type === "Beer" || r.type === "Braggot" ? (
                        <>
                          {r.malts && r.malts.length > 0 && (
                            <div>
                              <strong>Malts:</strong>
                              <ul className="list-disc ml-6 opacity-80">
                                {r.malts.map((m: any, i: number) => (
                                  <li key={i}>
                                    {m.name} — {m.amount} kg
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {r.hops && r.hops.length > 0 && (
                            <div>
                              <strong>Hops:</strong>
                              <ul className="list-disc ml-6 opacity-80">
                                {r.hops.map((h: any, i: number) => (
                                  <li key={i}>
                                    {h.name} — {h.amount} g @ {h.time} min
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {r.boil_time && (
                            <p>
                              <strong>Boil time:</strong> {r.boil_time} min
                            </p>
                          )}
                        </>
                      ) : null}

                      {r.type === "Wine" || r.type === "Cider" || r.type === "Hard Seltzer" ? (
                        <>
                          {r.juice_type && (
                            <p>
                              <strong>Juice / Must:</strong> {r.juice_type}
                            </p>
                          )}
                          {r.sugar_amount && (
                            <p>
                              <strong>Sugar added:</strong> {r.sugar_amount}
                            </p>
                          )}
                        </>
                      ) : null}

                      {r.type === "Other" && r.ingredients && (
                        <div>
                          <strong>Ingredients:</strong>
                          <ul className="list-disc ml-6 opacity-80">
                            {r.ingredients.map((ing: any, i: number) => (
                              <li key={i}>
                                {ing.name} — {ing.amount} {ing.unit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {r.steps && r.steps.length > 0 && (
                        <div>
                          <strong>Steps:</strong>
                          <ul className="list-disc ml-6 opacity-80">
                            {r.steps.map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Shared fields */}
                      {r.yeast && (
                        <p>
                          <strong>Yeast:</strong> {r.yeast}
                        </p>
                      )}

                      {r.additives && (
                        <p className="whitespace-pre-line">
                          <strong>Additives:</strong>
                          {"\n"}
                          {r.additives}
                        </p>
                      )}

                      {r.full_process && (
                        <p className="whitespace-pre-line">
                          <strong>Full process:</strong>
                          {"\n"}
                          {r.full_process}
                        </p>
                      )}

                      {r.notes && (
                        <p className="whitespace-pre-line">
                          <strong>Notes:</strong>
                          {"\n"}
                          {r.notes}
                        </p>
                      )}

                      {/* Secondary */}
                      {r.had_secondary && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-white/90 mb-2">
                            Secondary fermentation
                          </h4>

                          {r.secondary_additions && (
                            <p className="whitespace-pre-line opacity-80">
                              <strong>Secondary additions:</strong>
                              {"\n"}
                              {r.secondary_additions}
                            </p>
                          )}

                          {r.secondary_notes && (
                            <p className="whitespace-pre-line opacity-80 mt-2">
                              <strong>Secondary notes:</strong>
                              {"\n"}
                              {r.secondary_notes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Note log */}
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

        {/* DELETE CONFIRMATION */}
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

        {/* STYLE SELECT MODAL */}
        {openStyleSelect && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setOpenStyleSelect(false)}
          >
            <div
              className="bg-black/60 p-6 rounded-xl border border-white/10 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-center mb-6">Choose recipe type</h2>

              <div className="flex flex-col gap-4">
                {["Mead", "Beer", "Cider", "Wine", "Hard Seltzer", "Braggot", "Other"].map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => {
                        window.location.href = `/recipes/new/${type.toLowerCase()}`;
                      }}
                      className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
                    >
                      {type}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setOpenStyleSelect(false)}
                className="mt-8 w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
              >
                Cancel
              </button>
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
