"use client";

import Image from "next/image";
import RecipePresentation from "@/app/components/RecipePresentation";
import PublicMentionText from "@/app/components/PublicMentionText";

export default function RecipeDetailsContent({ recipe }: { recipe: any }) {
  const notes = recipe.notes_log || [];

  return (
    <>
      <RecipePresentation recipe={recipe} />
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
                {note.note && (
                  <p className="mt-3 whitespace-pre-line">
                    <PublicMentionText text={note.note} unitAware />
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/60">No recipe notes yet.</p>
        )}
      </section>
    </>
  );
}
