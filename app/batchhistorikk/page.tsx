export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export default async function BatchHistorikkPage() {
  const { supabase } = supabaseServer();

  // Hent bruker
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

  // Hent alle batches
  const { data: batches } = await supabase
    .from("batches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Hent alle kar
  const { data: kars } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", user.id);

  // ⭐ Sorter kar slik dashboardet gjør
  const sortedKars = [...(kars ?? [])].sort((a, b) => a.nummer - b.nummer);

  // ⭐ Lag brukerens kar-nummer (index + 1)
  const enriched = batches?.map((batch) => {
    const index = sortedKars.findIndex((k) => k.id === batch.aktivt_kar);

    // Finn tidligere kar hvis batchen ikke lenger er knyttet til et kar
    const previousKar = sortedKars.find((k) => k.id === batch.aktivt_kar);
    const previousKarNummer = previousKar
      ? sortedKars.findIndex((k) => k.id === previousKar.id) + 1
      : null;

    return {
      ...batch,
      brukerKarNummer: index !== -1 ? index + 1 : null,
      tidligereKarNummer: previousKarNummer,
    };
  });

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-4xl border border-white/10">

        {/* Tilbake */}
        <a
          href="/dashboard"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          ← Tilbake
        </a>

        <h1 className="text-4xl font-bold mb-6 text-center">
          Batch historikk
        </h1>

        {!enriched || enriched.length === 0 ? (
          <p className="text-center opacity-70">Ingen batches funnet.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {enriched.map((batch) => (
              <div
                key={batch.id}
                className="p-4 bg-white/10 border border-white/20 rounded-xl"
              >
                <h2 className="text-xl font-bold text-green-300 mb-2">
                  {batch.name}
                </h2>

                <p className="opacity-80">Batchnummer: {batch.batchnummer}</p>
                <p className="opacity-80">Status: {batch.status}</p>
                <p className="opacity-80">Volum: {batch.volume_l} L</p>
                <p className="opacity-80">OG: {batch.og}</p>

                {batch.fg && <p className="opacity-80">FG: {batch.fg}</p>}
                {batch.abv && (
                  <p className="opacity-80">ABV: {batch.abv.toFixed(2)}%</p>
                )}

                <p className="opacity-80">
                  Startdato: {new Date(batch.startdato).toLocaleDateString()}
                </p>

                {batch.finished_date && (
                  <p className="opacity-80">
                    Avsluttet:{" "}
                    {new Date(batch.finished_date).toLocaleDateString()}
                  </p>
                )}

                {/* ⭐ Riktig kar-tekst */}
                <p className="opacity-80">
                  {batch.brukerKarNummer
                    ? `Kar ${batch.brukerKarNummer}`
                    : batch.tidligereKarNummer
                    ? `Ikke lenger knyttet til kar (tidligere Kar ${batch.tidligereKarNummer})`
                    : "Ikke lenger knyttet til kar"}
                </p>

                {batch.finished_notes && (
                  <p className="opacity-80 mt-2">
                    Notater: {batch.finished_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg - Batchlogg
        </p>
      </div>
    </main>
  );
}
