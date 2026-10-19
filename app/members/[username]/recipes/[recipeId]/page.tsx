export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../../../../lib/supabase/supabaseServerFinal";
import Image from "next/image";
import Link from "next/link";
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

  let sourceRecipe: { id: string; user_id: string; name: string } | null = null;
  if (recipe.source_recipe_id) {
    const { data, error } = await serviceRole
      .from("recipes")
      .select("id, user_id, name")
      .eq("id", recipe.source_recipe_id)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(`Could not load recipe source: ${error.message}`);
    sourceRecipe = data;
  }

  let sourceAuthor: { username: string } | null = null;
  if (sourceRecipe) {
    const { data, error } = await serviceRole
      .from("profiles")
      .select("username")
      .eq("id", sourceRecipe.user_id)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(`Could not load recipe source author: ${error.message}`);
    sourceAuthor = data;
  }

  const { data: forkRows, error: forksError } = await serviceRole
    .from("recipes")
    .select("id, user_id, name")
    .eq("source_recipe_id", recipe.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(100);
  if (forksError) throw new Error(`Could not load public recipe versions: ${forksError.message}`);

  const forkAuthorIds = [...new Set((forkRows ?? []).map((fork) => fork.user_id))];
  let forkAuthorsById = new Map<string, string>();
  if (forkAuthorIds.length > 0) {
    const { data, error } = await serviceRole
      .from("profiles")
      .select("id, username")
      .eq("is_public", true)
      .in("id", forkAuthorIds);
    if (error) throw new Error(`Could not load recipe version authors: ${error.message}`);
    forkAuthorsById = new Map((data ?? []).map((author) => [author.id, author.username]));
  }

  const publicForks = (forkRows ?? []).flatMap((fork) => {
    const author = forkAuthorsById.get(fork.user_id);
    return author ? [{ ...fork, author }] : [];
  });
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

        {sourceRecipe && sourceAuthor && (
          <p className="mt-5 text-sm text-white/65">
            A version of{" "}
            <Link
              href={`/members/${encodeURIComponent(sourceAuthor.username)}/recipes/${sourceRecipe.id}`}
              className="text-green-200 underline"
            >
              {sourceRecipe.name}
            </Link>
            {" "}by {sourceAuthor.username}
          </p>
        )}

        {publicForks.length > 0 && (
          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <h2 className="mb-4 border-b border-white/10 pb-3 text-lg font-semibold text-green-300">
              Community versions
            </h2>
            <ul className="space-y-2">
              {publicForks.map((fork) => (
                <li key={fork.id}>
                  <Link
                    href={`/members/${encodeURIComponent(fork.author)}/recipes/${fork.id}`}
                    className="text-green-200 underline"
                  >
                    {fork.name}
                  </Link>
                  <span className="text-white/60"> by {fork.author}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

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
