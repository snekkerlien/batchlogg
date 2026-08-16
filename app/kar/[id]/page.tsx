import { supabase } from "@/lib/supabaseClient";
import { createBatch } from "@/app/actions/createBatch";
import { notFound } from "next/navigation";

type Props = {
  params: {
    id: string;
  };
};

export default async function KarPage({ params }: Props) {
  const karId = Number(params.id);

  if (isNaN(karId) || karId < 1 || karId > 6) {
    notFound();
  }

  const { data: activeBatch } = await supabase
    .from("batches")
    .select("*")
    .eq("aktivt_kar", karId)
    .eq("status", "Aktiv")
    .maybeSingle();

  const hasActive = !!activeBatch;

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="w-full max-w-lg bg-zinc-900 p-6 rounded-xl shadow-xl">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Kar {karId}
        </h1>

        {hasActive ? (
          <div className="space-y-2">
            <p className="text-lg font-semibold">
              Aktiv batch: {activeBatch.batchnavn}
            </p>

            <p>Startdato: {activeBatch.startdato}</p>
            <p>Status: {activeBatch.status}</p>
            <p>Batchnummer: {activeBatch.batchnummer}</p>
            <p>Batchstørrelse: {activeBatch.batchstorrelse} L</p>
            <p>OG: {activeBatch.og}</p>
            <p>FG: {activeBatch.fg}</p>
            <p>Oppskrift: {activeBatch.oppskrift}</p>

            <p className="mt-4 text-sm text-zinc-400">
              Logg og kommentarer kommer i neste steg.
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-zinc-300">
              Ingen aktiv gjæring på dette karet. Opprett ny batch:
            </p>

            <form action={createBatch} className="space-y-4">
              <div>
                <label className="block mb-1">Batchnavn</label>
                <input
                  type="text"
                  name="batchnavn"
                  required
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <div>
                <label className="block mb-1">Startdato</label>
                <input
                  type="date"
                  name="startdato"
                  required
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <input type="hidden" name="kar" value={karId} />

              <div>
                <label className="block mb-1">Status</label>
                <select
                  name="status"
                  required
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                >
                  <option value="Aktiv">Aktiv</option>
                  <option value="Secondary">Secondary</option>
                  <option value="Klaring">Klaring</option>
                  <option value="Flasket">Flasket</option>
                </select>
              </div>

              <div>
                <label className="block mb-1">Batchstørrelse (liter)</label>
                <input
                  type="number"
                  name="batchstorrelse"
                  required
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <div>
                <label className="block mb-1">OG</label>
                <input
                  type="number"
                  step="0.001"
                  name="og"
                  required
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <div>
                <label className="block mb-1">FG</label>
                <input
                  type="number"
                  step="0.001"
                  name="fg"
                  required
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <div>
                <label className="block mb-1">Oppskrift</label>
                <input
                  type="text"
                  name="oppskrift"
                  required
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 p-2 rounded font-semibold"
              >
                Opprett batch
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
