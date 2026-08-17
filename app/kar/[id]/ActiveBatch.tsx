import { createClient } from "@supabase/supabase-js";
import DeleteModal from "./DeleteModal";

export default async function ActiveBatch({ batchnummer }: { batchnummer: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const formattedBatch = String(batchnummer).padStart(4, "0");

  const { data: batch, error } = await supabase
    .from("Batches")
    .select("*")
    .eq("batchnummer", formattedBatch)
    .single();

  if (error || !batch) {
    return (
      <div className="p-4 bg-zinc-900 rounded-lg border border-white/10">
        <p className="text-red-400">Fant ingen aktiv batch.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-900 rounded-lg border border-white/10 space-y-4">
      <h2 className="text-xl font-semibold">Aktiv batch</h2>

      <div className="space-y-1">
        <p><strong>Batchnummer:</strong> {batch.batchnummer}</p>
        <p><strong>Status:</strong> {batch.status}</p>
        <p><strong>Startdato:</strong> {batch.startdato}</p>
        <p><strong>Batchstørrelse:</strong> {batch.batchstorrelse}</p>
        <p><strong>OG:</strong> {batch.og}</p>
        <p><strong>FG:</strong> {batch.fg}</p>
      </div>

      <DeleteModal batchnummer={batch.batchnummer} />
    </div>
  );
}
