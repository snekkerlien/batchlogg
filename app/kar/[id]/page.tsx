import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function KarPage({ params }: Props) {
  // Next.js 16: params er en Promise
  const { id } = await params;
  const karId = Number(id);

  if (isNaN(karId) || karId < 1 || karId > 6) {
    notFound();
  }

  // Hent aktiv batch for dette karet
  const { data: batch } = await supabase
    .from("batches")
    .select("*")
    .eq("aktivt_kar", karId)
    .eq("status", "Aktiv")
    .maybeSingle();

  const ledig = !batch;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6">Kar {karId}</h1>

        {ledig ? (
          <div className="border border-white/10 rounded-xl p-8 bg-white/5">
            <h2 className="text-2xl font-semibold mb-4">Status</h2>
            <p className="text-lg opacity-80">Ledig</p>
          </div>
        ) : (
          <div className="border border-white/10 rounded-xl p-8 bg-white/5 text-left">
            <h2 className="text-2xl font-semibold mb-4">Aktiv batch</h2>

            <div className="space-y-3">
              <p>
                <span className="opacity-70">Batchnavn:</span>{" "}
                <span className="font-semibold">{batch.navn}</span>
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
                <span className="opacity-70">OG:</span>{" "}
                {batch.og ?? "—"}
              </p>

              <p>
                <span className="opacity-70">FG (nå):</span>{" "}
                {batch.fg ?? "—"}
              </p>
            </div>
          </div>
        )}

        <p className="text-sm opacity-40 mt-12">
          © {new Date().getFullYear()} Batchlogg – laget av Mads
        </p>
      </div>
    </main>
  );
}
