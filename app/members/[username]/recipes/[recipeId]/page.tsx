export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../../../../lib/supabase/supabaseServerFinal";
import Image from "next/image";
import { notFound } from "next/navigation";
import PageHeading from "@/app/components/PageHeading";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import type { Fruit, Malt, Hop, Ingredient } from "@/app/types/batchTypes";
import { Qty } from "@/app/components/Units";

export default async function RecipeNotesPage({
  params,
}: {
  params: { username: string; recipeId: string };
}) {
  const { supabase, serviceRole } = supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError && userError.name !== "AuthSessionMissingError") {
    throw new Error(`Could not verify the current user: ${userError.message}`);
  }

  const { data: profile, error: profileError } = await serviceRole
    .from("profiles")
    .select("id, username, is_public")
    .eq("username", params.username)
    .maybeSingle();
  if (profileError) throw new Error(`Could not load recipe author: ${profileError.message}`);
  if (!profile) notFound();

  const viewingOwnProfile = user?.id === profile.id;
  if (!profile.is_public && !viewingOwnProfile) notFound();

  const recipeQuery = serviceRole
    .from("recipes")
    .select("*")
    .eq("id", params.recipeId)
    .eq("user_id", profile.id);
  if (!viewingOwnProfile) recipeQuery.eq("is_public", true);
  const { data: recipe, error: recipeError } = await recipeQuery.maybeSingle();
  if (recipeError) throw new Error(`Could not load recipe: ${recipeError.message}`);

  if (!recipe) notFound();

  const notes = viewingOwnProfile ? recipe.notes_log || [] : [];
  const hasSecondaryDetails =
    recipe.had_secondary ||
    Boolean(recipe.secondary_additions?.trim()) ||
    Boolean(recipe.secondary_notes?.trim());
  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        <PublicPageNavigation current="profiles" />

        <PageHeading
          title={recipe.name.charAt(0).toUpperCase() + recipe.name.slice(1)}
          subtitle={`Shared by ${profile.username}. Recipe details${viewingOwnProfile ? " and note log" : ""}.`}
        />

        {/* Recipe info */}
<div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">

  <h2 className="text-2xl font-semibold mb-3 text-green-300">
    Recipe details
  </h2>

  {/* Base values */}
  {recipe.og != null && (
    <p className="text-sm opacity-90">
      <strong>OG:</strong> {Number(recipe.og).toFixed(3)}
    </p>
  )}

{recipe.fg != null && (
  <p className="text-sm opacity-90">
    <strong>FG:</strong> {Number(recipe.fg).toFixed(3)}
  </p>
)}

  {recipe.abv != null && <p className="text-sm opacity-90"><strong>ABV:</strong> {Number(recipe.abv).toFixed(1)}%</p>}
  <p className="text-sm opacity-90"><strong>Volume:</strong> <Qty kind="volume" value={recipe.volume} /></p>

  {/* MEAD */}
  {recipe.type === "Mead" && (
    <>
      {recipe.honey_type && recipe.honey_amount && (
        <p><strong>Honey:</strong> {recipe.honey_type} – <Qty kind="kg" value={recipe.honey_amount} /></p>
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
      <p>
        <strong>Recipe style:</strong>{" "}
        {recipe.ingredients?.beer_subtype === "fresh_wort_kit"
          ? "Fresh wort kit"
          : recipe.ingredients?.beer_subtype === "malt_extract_kit"
            ? "Malt extract kit"
            : "All-grain"}
      </p>
      {recipe.ingredients?.kit_url && (
        <p>
          <strong>Kit link:</strong>{" "}
          <a
            href={recipe.ingredients.kit_url}
            target="_blank"
            rel="noreferrer"
            className="text-green-300 underline"
          >
            Open kit
          </a>
        </p>
      )}
      {recipe.malts?.length > 0 && (
        <div>
          <strong>Malt additions:</strong>
          {recipe.malts.map((m: Malt, i: number) => (
            <p key={i}>{m.name}: <Qty kind="kg" value={m.amount} /></p>
          ))}
        </div>
      )}

      {recipe.hops?.length > 0 && (
        <div>
          <strong>Hop schedule:</strong>
          {recipe.hops.map((h: Hop, i: number) => (
            <p key={i}>
              {h.name}: <Qty kind="g" value={h.amount} maxDecimals={0} /> @{" "}
              {h.addition_type === "whirlpool"
                ? `whirlpool ${h.time} min at ${h.temperature}°C`
                : `${h.time} min boil`}
            </p>
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
            <p key={i}>{m.name}: <Qty kind="kg" value={m.amount} /></p>
          ))}
        </div>
      )}

      {recipe.boil_time && (
        <p><strong>Boil time:</strong> {recipe.boil_time} min</p>
      )}

      {recipe.honey_amount && (
        <p><strong>Honey:</strong> <Qty kind="kg" value={recipe.honey_amount} /></p>
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
        <p><strong>Sugar added:</strong> <Qty kind="kg" value={recipe.sugar_amount} /></p>
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
        {hasSecondaryDetails && (
          <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="mb-3 text-xl font-semibold text-green-300">
              Secondary fermentation
            </h2>
            {recipe.secondary_additions?.trim() ? (
              <p className="whitespace-pre-line text-sm opacity-90">
                <strong>Secondary additions:</strong>
                <br />
                {recipe.secondary_additions}
              </p>
            ) : recipe.had_secondary ? (
              <p className="text-sm opacity-75">
                This recipe includes a secondary fermentation.
              </p>
            ) : null}
            {recipe.secondary_notes?.trim() && (
              <p className="mt-3 whitespace-pre-line text-sm opacity-90">
                <strong>Secondary notes:</strong>
                <br />
                {recipe.secondary_notes}
              </p>
            )}
          </section>
        )}
        {viewingOwnProfile && (
          <>
        <h2 className="text-2xl font-semibold mt-12 mb-4 text-center">
          Note log
        </h2>

        <div className="space-y-4">
          {notes.length > 0 ? (
            notes.map((n: any) => (
              <div
                key={n.id}
                className="p-4 bg-white/10 border border-white/20 rounded-xl"
              >
                <p className="text-sm opacity-60">
                  {new Date(n.created_at).toLocaleDateString("en-GB")}
                </p>

                {n.note_type === "image" && n.image_url && (
                  <Image
                    src={n.image_url}
                    alt="Note image"
                    width={960}
                    height={720}
                    sizes="(max-width: 768px) 100vw, 768px"
                    loading="lazy"
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
          </>
        )}

      </div>
    </main>
  );
}
