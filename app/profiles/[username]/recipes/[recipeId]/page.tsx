export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../../../../lib/supabase/supabaseServerFinal";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";

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

        {/* Header */}
        <h1 className="text-4xl font-bold mb-6 text-center">
          {recipe.name.charAt(0).toUpperCase() + recipe.name.slice(1)}
        </h1>

        <p className="opacity-80 text-center mb-10">
          Note log and details for this recipe.
        </p>

        {/* Recipe info */}
        <div className="space-y-6">

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h2 className="text-2xl font-semibold mb-3">Base values</h2>

            <p className="text-lg">
              <strong>OG:</strong> {recipe.og}
            </p>

            <p className="text-lg mt-2">
              <strong>FG:</strong> {recipe.fg}
            </p>

            <p className="text-lg mt-2">
              <strong>ABV:</strong> {recipe.abv.toFixed(1)}%
            </p>

            <p className="text-lg mt-2">
              <strong>Volume:</strong> {recipe.volume} L
            </p>
          </div>

          {recipe.ingredients && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl whitespace-pre-line">
              <h2 className="text-2xl font-semibold mb-3">Ingredients</h2>
              {recipe.ingredients}
            </div>
          )}

          {recipe.method && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl whitespace-pre-line">
              <h2 className="text-2xl font-semibold mb-3">Method</h2>
              {recipe.method}
            </div>
          )}

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl whitespace-pre-line">
            <h2 className="text-2xl font-semibold mb-3">Notes</h2>
            {recipe.notes || "No notes added"}
          </div>

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
