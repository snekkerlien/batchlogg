import { supabaseServer } from "../../../../../lib/supabase/supabaseServerFinal";

export default async function Logg({ batchId }: { batchId: string }) {
  const supabase = supabaseServer();

  const { data: notes } = await supabase
    .from("batch_notes")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false });

  if (!notes || notes.length === 0)
    return <p className="opacity-60">Ingen notater enda.</p>;

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
            <img
              src={n.image_url}
              alt="Batch bilde"
              className="rounded-lg mt-2"
            />
          ) : null}

          {n.note && (
            <p className="mt-2 whitespace-pre-line">{n.note}</p>
          )}
        </div>
      ))}
    </div>
  );
}
