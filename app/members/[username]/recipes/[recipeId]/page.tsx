export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../../../../lib/supabase/supabaseServerFinal";
import Image from "next/image";
import { notFound } from "next/navigation";
import PageHeading from "@/app/components/PageHeading";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import RecipePresentation from "@/app/components/RecipePresentation";

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

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto w-full max-w-4xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-8">
        <PublicPageNavigation current="profiles" />
        <PageHeading
          title={recipe.name.charAt(0).toUpperCase() + recipe.name.slice(1)}
          subtitle={`Shared by ${profile.username}. Recipe details${viewingOwnProfile ? " and note log" : ""}.`}
        />

        <RecipePresentation recipe={recipe} />

        {viewingOwnProfile && (
          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <h2 className="mb-4 border-b border-white/10 pb-3 text-lg font-semibold text-green-300">
              Recipe note log
            </h2>
            {notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map((note: any) => (
                  <article key={note.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-white/55">
                      {new Date(note.created_at).toLocaleDateString("en-GB")}
                    </p>
                    {note.note_type === "image" && note.image_url && (
                      <Image
                        src={note.image_url}
                        alt="Recipe note"
                        width={960}
                        height={720}
                        sizes="(max-width: 768px) 100vw, 768px"
                        unoptimized
                        loading="lazy"
                        className="mt-3 rounded-lg"
                      />
                    )}
                    {note.note && <p className="mt-3 whitespace-pre-line">{note.note}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">No recipe notes yet.</p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
