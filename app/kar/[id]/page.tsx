export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ActiveBatch from "./ActiveBatch";
import RegisterBatchForm from "./RegisterBatchForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function KarPage(props: Props) {
  const { id } = await props.params;
  const karId = Number(id);

  if (isNaN(karId) || karId < 1 || karId > 6) {
    notFound();
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: batch } = await supabase
    .from("Batches")
    .select("*")
    .eq("aktivt_kar", karId)
    .eq("status", "Aktiv")
    .maybeSingle();

  const ledig = !batch;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-xl w-full">
        <h1 className="text-4xl font-bold mb-6 text-center">Kar {karId}</h1>

        {ledig ? (
          <div className="border border-white/10 rounded-xl p-8 bg-white/5">
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Ledig kar
            </h2>

            <p className="opacity-80 mb-6 text-center">
              Dette karet har ingen aktiv gjæring.
            </p>

            <h3 className="text-xl font-semibold mb-4 text-center">
              Registrer ny batch
            </h3>

            {/* ⭐ Nytt client-skjema */}
            <RegisterBatchForm karId={karId} />

            <a
              href="/"
              className="mt-6 block text-center px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold transition"
            >
              ← Tilbake
            </a>
          </div>
        ) : (
          <div className="border border-white/10 rounded-xl p-8 bg-white/5">
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Aktiv batch
            </h2>

            <div className="space-y-3 text-left">
              <p>
                <span className="opacity-70">Batchnummer:</span>{" "}
                <span className="font-semibold">{batch.batchnummer ?? "?"}</span>
              </p>

              <p>
                <span className="opacity-70">Batchnavn:</span>{" "}
                <span className="font-semibold">{batch.name}</span>
              </p>

              <p>
                <span className="opacity-70">Status:</span>{" "}
                <span className="text-green-400 font-semibold">
                  {batch.status}
                </span>
              </p>

              <p>
                <span className="opacity-70">Startdato:</span>{" "}
                {batch.startdato}
              </p>

              <p>
                <span className="opacity-70">Volum:</span>{" "}
                {batch.volume_l} L
              </p>

              <p>
                <span className="opacity-70">OG:</span>{" "}
                {batch.og}
              </p>

              <p>
                <span className="opacity-70">Oppskrift:</span>{" "}
                {batch.oppskrift}
              </p>
            </div>

            <ActiveBatch batch={batch} />
          </div>
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlogg – laget av Mads
        </p>
      </div>
    </main>
  );
}
