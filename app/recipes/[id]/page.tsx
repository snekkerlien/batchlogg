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

        {/* BASE VALUES OUTSIDE CARD */}
        <div className="space-y-2 mb-10 text-lg">
          <p><strong>OG:</strong> {Number(recipe.og).toFixed(3)}</p>
          <p><strong>FG:</strong> {Number(recipe.fg).toFixed(3)}</p>
          <p><strong>ABV:</strong> {recipe.abv.toFixed(1)}%</p>
          <p><strong>Volume:</strong> {recipe.volume} L</p>
        </div>

        {/* FULL RECIPE DETAILS */}
        <div className="space-y-6 opacity-90">

          {/* Mead */}
          {recipe.type === "Mead" && (
            <>
              {recipe.honey_type && (
                <p><strong>Honey type:</strong> {recipe.honey_type}</p>
              )}

              {recipe.honey_amount && (
                <p><strong>Honey amount:</strong> {recipe.honey_amount} kg</p>
              )}

              {recipe.fruits?.length > 0 && (
                <div>
                  <strong>Fruits:</strong>
                  <ul className="list-disc ml-6 opacity-80">
                    {recipe.fruits.map((f: any, i: number) => (
                      <li key={i}>{f.name} — {f.amount} {f.unit}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Beer / Braggot */}
          {(recipe.type === "Beer" || recipe.type === "Braggot") && (
            <>
              <p className="text-xs opacity-60 mt-2">
                Note: If the IBU or EBC values differ from the recipe you imported,
                this is because Batchlogg uses more accurate brewing models
                (Tinseth for bitterness and Morey for color).
              </p>

              {recipe.malts?.length > 0 && (
                <div>
                  <strong>Malts:</strong>
                  <ul className="list-disc ml-6 opacity-80">
                    {recipe.malts.map((m: any, i: number) => (
                      <li key={i}>{m.name} — {m.amount} kg</li>
                    ))}
                  </ul>

                  <p className="mt-2 opacity-80">
                    <strong>Total malt:</strong>{" "}
                    {recipe.malts.reduce((sum: number, m: any) => sum + Number(m.amount), 0).toFixed(2)} kg
                  </p>
                </div>
              )}

              {recipe.hops?.length > 0 && (
                <div>
                  <strong>Hops:</strong>
                  <ul className="list-disc ml-6 opacity-80">
                    {recipe.hops.map((h: any, i: number) => (
                      <li key={i}>
                        {h.name} {h.amount} g @ {h.time} min
                        {h.alpha && <> - {Number(h.alpha)}% Alpha Acid</>}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-2 opacity-80">
                    <strong>Total hops:</strong>{" "}
                    {(
                      recipe.hops.reduce((sum: number, h: any) => sum + Number(h.amount), 0) +
                      (recipe.dry_hops?.reduce((sum: number, h: any) => sum + Number(h.amount), 0) || 0)
                    ).toFixed(0)} g
                  </p>
                </div>
              )}

              {recipe.dry_hops?.length > 0 && (
                <div className="mt-3">
                  <strong>Dry hops:</strong>
                  <ul className="list-disc ml-6 opacity-80">
                    {recipe.dry_hops.map((h: any, i: number) => (
                      <li key={i}>{h.name} — {h.amount} g — {h.contact} days contact</li>
                    ))}
                  </ul>

                  <p className="mt-2 opacity-80">
                    <strong>Total dry hops:</strong>{" "}
                    {recipe.dry_hops.reduce((sum: number, h: any) => sum + Number(h.amount), 0).toFixed(0)} g
                  </p>
                </div>
              )}

              {recipe.boil_time && (
                <p><strong>Boil time:</strong> {recipe.boil_time} min</p>
              )}
            </>
          )}

          {/* Wine / Cider / Seltzer */}
          {(recipe.type === "Wine" || recipe.type === "Cider" || recipe.type === "Seltzer") && (
            <>
              {recipe.juice_type && (
                <p><strong>Juice / Must:</strong> {recipe.juice_type}</p>
              )}
              {recipe.sugar_amount && (
                <p><strong>Sugar added:</strong> {recipe.sugar_amount}</p>
              )}
            </>
          )}

          {/* Other */}
          {recipe.type === "Other" && recipe.ingredients && (
            <div>
              <strong>Ingredients:</strong>
              <ul className="list-disc ml-6 opacity-80">
                {recipe.ingredients.map((ing: any, i: number) => (
                  <li key={i}>{ing.name} — {ing.amount} {ing.unit}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Steps */}
          {recipe.steps?.length > 0 && (
            <div>
              <strong>Steps:</strong>
              <ul className="list-disc ml-6 opacity-80">
                {recipe.steps.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Shared */}
          {recipe.yeast && <p><strong>Yeast:</strong> {recipe.yeast}</p>}

          {recipe.additives && (
            <p className="whitespace-pre-line">
              <strong>Additives:</strong>{"\n"}{recipe.additives}
            </p>
          )}

          {recipe.full_process && (
            <p className="whitespace-pre-line">
              <strong>Full process:</strong>{"\n"}{recipe.full_process}
            </p>
          )}

          {recipe.notes && (
            <p className="whitespace-pre-line">
              <strong>Notes:</strong>{"\n"}{recipe.notes}
            </p>
          )}

          {/* Secondary */}
          {recipe.had_secondary && (
            <div className="mt-6">
              <h4 className="font-semibold text-white/90 mb-2">Secondary fermentation</h4>

              {recipe.secondary_additions && (
                <p className="whitespace-pre-line opacity-80">
                  <strong>Secondary additions:</strong>{"\n"}{recipe.secondary_additions}
                </p>
              )}

              {recipe.secondary_notes && (
                <p className="whitespace-pre-line opacity-80 mt-2">
                  <strong>Secondary notes:</strong>{"\n"}{recipe.secondary_notes}
                </p>
              )}
            </div>
          )}

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
