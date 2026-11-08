import { supabaseServer } from "../../../../lib/supabase/supabaseServerFinal";
import PublicMentionText from "@/app/components/PublicMentionText";
import TranslatedText from "@/app/components/TranslatedText";

export default async function Logg({ batchId }: { batchId: string }) {
  // ⭐ Bruk riktig serverklient med cookies
  const { supabase } = supabaseServer();

  // ⭐ Hent notater for batchen (SELECT-policy må tillate public read)
  const { data: notes } = await supabase
    .from("batch_notes")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false });

  if (!notes || notes.length === 0)
    return <p className="opacity-60"><TranslatedText text="No batch notes yet." /></p>;

  return (
    <div className="space-y-4">
      {notes.map((n) => (
        <div
          key={n.id}
          className="p-4 bg-white/10 border border-white/20 rounded-xl"
        >
          <p className="text-sm opacity-60">
            {new Date(n.created_at).toLocaleString("no-NO")}
          </p>

          {n.note_type === "image" && n.image_url ? (
            <>
              <span id={`batch-image-${n.id}`} className="sr-only">
                <TranslatedText text="Batch image" />
              </span>
              <img
                src={n.image_url}
                alt=""
                aria-labelledby={`batch-image-${n.id}`}
                className="rounded-lg mt-2"
              />
            </>
          ) : null}

          {n.note && (
            <p className="mt-2 whitespace-pre-line"><PublicMentionText text={n.note} unitAware /></p>
          )}
        </div>
      ))}
    </div>
  );
}
