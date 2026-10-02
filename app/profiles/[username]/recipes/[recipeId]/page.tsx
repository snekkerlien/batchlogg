export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../../../../lib/supabase/supabaseServerFinal";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import PageHeading from "@/app/components/PageHeading";
import type { Fruit, Malt, Hop, Ingredient } from "@/app/types/batchTypes";

export default async function RecipeNotesPage({
  params,
}: {
  params: { username: string; recipeId: string };
}) {
  const { supabase } = supabaseServer();

  // Check login
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">You must be logged in</h1>
      </main>
    );
  }

  // Find user by username
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single();

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Profile not found</h1>
      </main>
    );
  }

  // ⭐ NEW: Hide private profiles unless owner
  const viewingOwnProfile = user.id === profile.id;

  if (!profile.is_public && !viewingOwnProfile) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">This profile is private</h1>
      </main>
    );
  }

  const userId = profile.id;

  // Fetch recipe
  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", params.recipeId)
    .eq("user_id", userId)
    .single();

  if (!recipe) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Recipe not found</h1>
      </main>
    );
  }

  // ⭐ Note log
  const notes = recipe.notes_log || [];
  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-6">
          <BackButton />
          <MenuOverlay />
        </div>

        <PageHeading
          title={recipe.name.charAt(0).toUpperCase() + recipe.name.slice(1)}
          subtitle="Note log and details for this recipe."
        />

        {/* Recipe info */}
<div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">

  <h2 className="text-2xl font-semibold mb-3 text-green-300">
    Recipe details
  </h2>

  {/* Base values */}
  <p className="text-sm opacity-90">
  <strong>OG:</strong> {Number(recipe.og).toFixed(3)}
</p>

<p className="text-sm opacity-90">
  <strong>FG:</strong> {Number(recipe.fg).toFixed(3)}
</p>

  <p className="text-sm opacity-90"><strong>ABV:</strong> {recipe.abv.toFixed(1)}%</p>
  <p className="text-sm opacity-90"><strong>Volume:</strong> {recipe.volume} L</p>

  {/* MEAD */}
  {recipe.type === "Mead" && (
    <>
      {recipe.honey_type && recipe.honey_amount && (
        <p><strong>Honey:</strong> {recipe.honey_type} – {recipe.honey_amount} kg</p>
      )}

      {recipe.fruits?.length > 0 && (
        <div>
          <strong>Fruits:</strong>
          {recipe.fruits.map((f: Fruit, i: number) => (
            <p key={i}>{f.name}: {f.amount}{f.unit}</p>
          ))}
        </div>
      )}

      {recipe.additives && (
        <p><strong>Additives:</strong><br />{recipe.additives}</p>
      )}

      {recipe.full_process && (
        <p><strong>Full process:</strong><br />{recipe.full_process}</p>
      )}

      {recipe.notes && (
        <p><strong>Notes:</strong><br />{recipe.notes}</p>
      )}
    </>
  )}

  {/* BEER */}
  {recipe.type === "Beer" && (
    <>
      {recipe.malts?.length > 0 && (
        <div>
          <strong>Malt additions:</strong>
          {recipe.malts.map((m: Malt, i: number) => (
            <p key={i}>{m.name}: {m.amount}{m.unit}</p>
          ))}
        </div>
      )}

      {recipe.hops?.length > 0 && (
        <div>
          <strong>Hop schedule:</strong>
          {recipe.hops.map((h: Hop, i: number) => (
            <p key={i}>{h.name}: {h.amount}{h.unit} @ {h.time} min</p>
          ))}
        </div>
      )}

      {recipe.boil_time && (
        <p><strong>Total boil time:</strong> {recipe.boil_time} min</p>
      )}

      {recipe.additives && (
        <p><strong>Additives:</strong><br />{recipe.additives}</p>
      )}

      {recipe.full_process && (
        <p><strong>Full process:</strong><br />{recipe.full_process}</p>
      )}

      {recipe.notes && (
        <p><strong>Notes:</strong><br />{recipe.notes}</p>
      )}
    </>
  )}

  {/* BRAGGOT */}
  {recipe.type === "Braggot" && (
    <>
      {recipe.malts?.length > 0 && (
        <div>
          <strong>Malt additions:</strong>
          {recipe.malts.map((m: Malt, i: number) => (
            <p key={i}>{m.name}: {m.amount}{m.unit}</p>
          ))}
        </div>
      )}

      {recipe.boil_time && (
        <p><strong>Boil time:</strong> {recipe.boil_time} min</p>
      )}

      {recipe.honey_amount && (
        <p><strong>Honey:</strong> {recipe.honey_amount} kg</p>
      )}

      {recipe.additives && (
        <p><strong>Additives:</strong><br />{recipe.additives}</p>
      )}

      {recipe.full_process && (
        <p><strong>Full process:</strong><br />{recipe.full_process}</p>
      )}

      {recipe.notes && (
        <p><strong>Notes:</strong><br />{recipe.notes}</p>
      )}
    </>
  )}

  {/* CIDER / WINE / SELTZER */}
  {(recipe.type === "Cider" || recipe.type === "Wine" || recipe.type === "Seltzer") && (
    <>
      {recipe.juice_type && (
        <p><strong>Juice type:</strong> {recipe.juice_type}</p>
      )}

      {recipe.sugar_amount && (
        <p><strong>Sugar added:</strong> {recipe.sugar_amount} kg</p>
      )}

      {recipe.additives && (
        <p><strong>Additives:</strong><br />{recipe.additives}</p>
      )}

      {recipe.full_process && (
        <p><strong>Full process:</strong><br />{recipe.full_process}</p>
      )}

      {recipe.notes && (
        <p><strong>Notes:</strong><br />{recipe.notes}</p>
      )}
    </>
  )}

  {/* OTHER */}
  {recipe.type === "Other" && (
    <>
      {recipe.ingredients?.length > 0 && (
        <div>
          <strong>Ingredients:</strong>
          {recipe.ingredients.map((ing: Ingredient, idx: number) => (
            <p key={idx}>{ing.name}: {ing.amount}{ing.unit}</p>
          ))}
        </div>
      )}

      {recipe.steps?.length > 0 && (
        <div>
          <strong>Process steps:</strong>
          {recipe.steps.map((s: string, idx: number) => (
            <p key={idx}>{idx + 1}. {s}</p>
          ))}
        </div>
      )}

      {recipe.additives && (
        <p><strong>Additives:</strong><br />{recipe.additives}</p>
      )}

      {recipe.notes && (
        <p><strong>Notes:</strong><br />{recipe.notes}</p>
      )}
    </>
  )}

</div>
        {/* ⭐ NOTE LOG */}
        <h2 className="text-2xl font-semibold mt-12 mb-4 text-center">
          Note log
        </h2>

        <div className="space-y-4">
          {notes && notes.length > 0 ? (
            notes.map((n: any) => (
              <div
                key={n.id}
                className="p-4 bg-white/10 border border-white/20 rounded-xl"
              >
                <p className="text-sm opacity-60">
                  {new Date(n.created_at).toLocaleDateString("en-GB")}
                </p>

                {n.note_type === "image" && n.image_url && (
                  <img
                    src={n.image_url}
                    alt="Note image"
                    className="rounded-lg mt-3"
                  />
                )}

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
