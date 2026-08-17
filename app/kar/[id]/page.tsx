import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createBatch } from "./actions/createBatch";
import { RecipeEditor } from "./RecipeEditor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function KarPage(props: Props) {
  // Next.js 16: params er en Promise → må awaites
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

            <form action={createBatch} className="space-y-4">
              <input type="hidden" name="kar" value={karId} />

              <div>
                <label className="block mb-1">Batchnavn</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Skriv navn på batchen"
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <div>
                <label className="block mb-1">Batchstørrelse (liter)</label>
                <input
                  type="number"
                  name="volume_l"
                  required
                  placeholder="Skriv antall liter"
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <div>
                <label className="block mb-1">Startdato</label>
                <input
                  type="date"
                  name="startdato"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
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
                  placeholder="Skriv original gravity"
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <div>
                <label className="block mb-1">Sikkerhetskode</label>
                <input
                  type="text"
                  name="kode"
                  required
                  placeholder="Velg en kode for sletting/endring"
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <RecipeEditor />

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 p-2 rounded font-semibold"
              >
                Registrer batch
              </button>
            </form>
          </div>
        ) : (
          <div className="border border-white/10 rounded-xl p-8 bg-white/5">
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Aktiv batch
            </h2>

            <div className="space-y-3 text-left">
              <p>
                <span className="opacity-70">Batchnummer:</span>{" "}
                <span className="font-semibold">{batch.batchnummer}</span>
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
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold transition"
          >
            ← Tilbake til hovedsiden
          </a>
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlogg – laget av Mads
        </p>
      </div>
    </main>
  );
}
