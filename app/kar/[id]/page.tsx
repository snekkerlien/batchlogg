export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import * as Actions from "./actions";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export default async function KarPage({ params }: { params: { id: string } }) {
  console.log("=== /kar/[id] START ===");

  // Bruk SSR-klienten riktig
  const { supabase } = supabaseServer();

  // Hent bruker fra cookies (ikke Authorization-header, ikke manuelt token)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("[/kar/[id]] User:", user);
  console.log("[/kar/[id]] UserError:", userError);

  if (!user) {
    console.log("[/kar/[id]] Ingen bruker → ikke innlogget");
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Du må være innlogget</h1>
      </main>
    );
  }

  console.log("[/kar/[id]] Henter kar:", params.id);

  const { data: kar, error: karError } = await supabase
    .from("kar")
    .select("*")
    .eq("id", params.id)
    .single();

  console.log("[/kar/[id]] Kar:", kar);
  console.log("[/kar/[id]] KarError:", karError);

  if (!kar) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Kar ikke funnet</h1>
      </main>
    );
  }

  console.log("[/kar/[id]] Henter batch...");

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("*")
    .eq("aktivt_kar", kar.id)
    .single();

  console.log("[/kar/[id]] Batch:", batch);
  console.log("[/kar/[id]] BatchError:", batchError);

  const hasBatch = !!batch;

  console.log("=== /kar/[id] END ===");

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        {/* Tilbake */}
        <div className="absolute top-4 left-4">
          <a
            href="/dashboard"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ← Tilbake
          </a>
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center">
          Kar {kar.displayNummer}
        </h1>

        {!hasBatch && (
          <p className="text-center opacity-70 mb-10">
            Dette karet er ledig.
          </p>
        )}

        {hasBatch && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Aktiv batch
            </h2>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">
              <h3 className="text-xl font-bold text-green-300 mb-2">
                {batch.name}
              </h3>

              <p className="opacity-80">OG: {batch.og}</p>
              <p className="opacity-80">Volum: {batch.volume_l} L</p>
              <p className="opacity-80">Status: {batch.status}</p>

              {batch.secondary_startdate && (
                <p className="opacity-80 mt-2">
                  Sekundær siden:{" "}
                  {new Date(batch.secondary_startdate).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* HANDLINGER */}
            <div className="flex flex-col gap-4">
              <form action={Actions.cancelBatch}>
                <input type="hidden" name="batch_id" value={batch.id} />
                <input type="hidden" name="kar_id" value={kar.id} />
                <button className="w-full px-4 py-3 bg-red-700 hover:bg-red-600 border border-red-500 rounded-lg font-semibold">
                  Kanseller batch
                </button>
              </form>

              <details className="bg-white/5 border border-white/10 rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-green-300">
                  Overfør til sekundær
                </summary>

                <form action={Actions.moveToSecondary} className="mt-4 flex flex-col gap-4">
                  <input type="hidden" name="batch_id" value={batch.id} />
                  <input type="hidden" name="kar_id" value={kar.id} />

                  <textarea
                    name="secondary_additions"
                    placeholder="Tilsetninger"
                    className="p-3 rounded bg-black/40 border border-white/20"
                  />

                  <textarea
                    name="secondary_notes"
                    placeholder="Notater"
                    className="p-3 rounded bg-black/40 border border-white/20"
                  />

                  <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
                    Overfør til sekundær
                  </button>
                </form>
              </details>

              <details className="bg-white/5 border border-white/10 rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-green-300">
                  Avslutt batch
                </summary>

                <form action={Actions.finishBatch} className="mt-4 flex flex-col gap-4">
                  <input type="hidden" name="batch_id" value={batch.id} />
                  <input type="hidden" name="kar_id" value={kar.id} />

                  <input
                    name="fg"
                    type="number"
                    step="0.001"
                    placeholder="FG (Final Gravity)"
                    className="p-3 rounded bg-black/40 border border-white/20"
                  />

                  <textarea
                    name="finished_notes"
                    placeholder="Avslutningsnotat"
                    className="p-3 rounded bg-black/40 border border-white/20"
                  />

                  <label className="flex items-center gap-3">
                    <input type="checkbox" name="save_as_recipe" />
                    Lagre som oppskrift
                  </label>

                  <button className="px-4 py-3 bg-blue-700 hover:bg-blue-600 border border-blue-500 rounded-lg font-semibold">
                    Avslutt batch
                  </button>
                </form>
              </details>
            </div>
          </>
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg AS.
        </p>
      </div>
    </main>
  );
}
