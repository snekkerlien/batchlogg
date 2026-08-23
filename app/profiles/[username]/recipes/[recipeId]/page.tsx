export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../../../../lib/supabase/supabaseServerFinal";
import Link from "next/link";

export default async function RecipeNotesPage({
  params,
}: {
  params: { username: string; recipeId: string };
}) {
  const { supabase } = supabaseServer();

  // Sjekk innlogging
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Du må være innlogget</h1>
      </main>
    );
  }

  // Finn bruker via username
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single();

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Profil ikke funnet</h1>
      </main>
    );
  }

  const userId = profile.id;

  // Hent oppskriften
  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", params.recipeId)
    .eq("user_id", userId)
    .single();

  if (!recipe) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Oppskrift ikke funnet</h1>
      </main>
    );
  }

  // ⭐ ENESTE ENDRING: Bruk notater lagret i oppskriften
  const notes = recipe.notes_log || [];

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        {/* Tilbake */}
        <div className="absolute top-4 left-4">
          <Link
            href={`/profiles/${params.username}`}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ← Tilbake
          </Link>
        </div>

        {/* Header */}
        <h1 className="text-4xl font-bold mb-6 text-center">
          {recipe.name.charAt(0).toUpperCase() + recipe.name.slice(1)}
        </h1>

        <p className="opacity-80 text-center mb-10">
          Notatlogg og detaljer for denne oppskriften.
        </p>

        {/* Oppskrift info */}
        <div className="space-y-6">

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h2 className="text-2xl font-semibold mb-3">Grunnverdier</h2>

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
              <strong>Volum:</strong> {recipe.volume} L
            </p>
          </div>

          {recipe.ingredients && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl whitespace-pre-line">
              <h2 className="text-2xl font-semibold mb-3">Ingredienser</h2>
              {recipe.ingredients}
            </div>
          )}

          {recipe.method && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl whitespace-pre-line">
              <h2 className="text-2xl font-semibold mb-3">Fremgangsmåte</h2>
              {recipe.method}
            </div>
          )}

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl whitespace-pre-line">
            <h2 className="text-2xl font-semibold mb-3">Notater</h2>
            {recipe.notes || "Ingen notater"}
          </div>

        </div>

        {/* ⭐ NOTATLOGG FRA notes_log */}
        <h2 className="text-2xl font-semibold mt-12 mb-4 text-center">
          Notatlogg
        </h2>

        <div className="space-y-4">
          {notes && notes.length > 0 ? (
            notes.map((n: any) => (
              <div
                key={n.id}
                className="p-4 bg-white/10 border border-white/20 rounded-xl"
              >
                {/* Kun dato */}
                <p className="text-sm opacity-60">
                  {new Date(n.created_at).toLocaleDateString("no-NO")}
                </p>

                {n.note_type === "image" && n.image_url && (
                  <img
                    src={n.image_url}
                    alt="Notatbilde"
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
            <p className="opacity-60 text-center">Ingen notater enda.</p>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg - Batchlogg
        </p>
      </div>
    </main>
  );
}
