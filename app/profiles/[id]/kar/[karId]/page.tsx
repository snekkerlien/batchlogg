export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers } from "next/headers";
import { supabaseServer } from "../../../../../lib/supabase/supabaseServerFinal";
import Link from "next/link";

export default async function KarDetailPage({
  params,
}: {
  params: { id: string; karId: string };
}) {
  console.log("=== /profiles/[id]/kar/[karId] START ===");

  const headerStore = headers();
  const authHeader = headerStore.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  console.log("[KarDetail] Token:", token);

  if (!token) {
    console.log("[KarDetail] Ingen token → ikke innlogget");
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Du må være innlogget</h1>
      </main>
    );
  }

  const { supabase } = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  console.log("[KarDetail] User:", user);
  console.log("[KarDetail] UserError:", userError);

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Du må være innlogget</h1>
      </main>
    );
  }

  const { data: kar, error: karError } = await supabase
    .from("kar")
    .select("*")
    .eq("id", params.karId)
    .eq("user_id", params.id)
    .single();

  console.log("[KarDetail] Kar:", kar);
  console.log("[KarDetail] KarError:", karError);

  if (!kar) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Kar ikke funnet</h1>
      </main>
    );
  }

  const { data: batches, error: batchesError } = await supabase
    .from("batches")
    .select("*")
    .eq("aktivt_kar", kar.id)
    .eq("user_id", params.id);

  console.log("[KarDetail] Batches:", batches);
  console.log("[KarDetail] BatchesError:", batchesError);

  const activeBatch = batches?.find((b) => b.status === "Aktiv");
  const now = Date.now();

  console.log("=== /profiles/[id]/kar/[karId] END ===");

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        <div className="absolute top-4 left-4">
          <Link
            href={`/profiles/${params.id}`}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ← Tilbake
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center">
          Kar {kar.nummer}
        </h1>

        <p className="opacity-80 text-center mb-10">
          Dette er en lesemodus. Du kan se informasjon, men ikke endre noe.
        </p>

        <div className="mb-10 p-4 bg-white/5 border border-white/10 rounded-xl">
          <h2 className="text-2xl font-semibold mb-4">Karstatus</h2>

          {(() => {
            const allBatches = batches ?? [];

            const lastBatch = allBatches
              .filter((b) => b.status === "Aktiv" || b.status === "Ferdig")
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )[0];

            if (activeBatch) {
              const started = new Date(activeBatch.created_at).getTime();
              const diffMs = now - started;
              const hours = Math.floor(diffMs / 1000 / 60 / 60);
              const days = Math.floor(hours / 24);
              const startDate = new Date(
                activeBatch.created_at
              ).toLocaleDateString("no-NO");

              return (
                <>
                  <p className="text-lg">
                    <span className="font-bold">Status:</span>{" "}
                    <span className="text-green-400">Aktiv</span>
                  </p>

                  <p className="text-lg mt-2">
                    <span className="font-bold">Aktiv siden:</span>{" "}
                    {days < 1
                      ? `i dag (${startDate})`
                      : `${startDate}, ${days} dager siden`}
                  </p>
                </>
              );
            }

            if (!lastBatch) {
              return (
                <>
                  <p className="text-lg">
                    <span className="font-bold">Status:</span>{" "}
                    <span className="text-zinc-400">Ledig</span>
                  </p>

                  <p className="text-lg mt-2">
                    <span className="font-bold">Historikk:</span>{" "}
                    Karet har aldri vært brukt
                  </p>
                </>
              );
            }

            const lastActiveTime = new Date(lastBatch.created_at).getTime();
            const diffMs = now - lastActiveTime;
            const hours = Math.floor(diffMs / 1000 / 60 / 60);
            const days = Math.floor(hours / 24);
            const lastDate = new Date(
              lastBatch.created_at
            ).toLocaleDateString("no-NO");

            return (
              <>
                <p className="text-lg">
                  <span className="font-bold">Status:</span>{" "}
                  <span className="text-zinc-400">Ledig</span>
                </p>

                <p className="text-lg mt-2">
                  <span className="font-bold">Sist aktiv:</span>{" "}
                  {days < 1
                    ? `i dag (${lastDate})`
                    : `${lastDate}, ${days} dager siden`}
                </p>
              </>
            );
          })()}
        </div>

        {activeBatch ? (
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h2 className="text-2xl font-semibold mb-4">Aktiv batch</h2>

            <p className="text-lg">
              <span className="font-bold">Navn:</span>{" "}
              {activeBatch.name || "Ingen navn satt"}
            </p>

            {(() => {
              const started = new Date(activeBatch.startdato).getTime();
              const diffMs = now - started;
              const hours = Math.floor(diffMs / 1000 / 60 / 60);
              const days = Math.floor(hours / 24);

              return (
                <p className="text-lg mt-2">
                  <span className="font-bold">Startet:</span>{" "}
                  {new Date(activeBatch.startdato).toLocaleDateString("no-NO")}
                  {" — "}
                  {days < 1 ? "i dag" : `${days} dager siden`}
                </p>
              );
            })()}

            <p className="text-lg mt-2">
              <span className="font-bold">Status:</span>{" "}
              {activeBatch.status}
            </p>

            <p className="text-lg mt-2">
              <span className="font-bold">Volum:</span>{" "}
              {activeBatch.volume_l} L
            </p>

            <p className="text-lg mt-2">
              <span className="font-bold">OG:</span>{" "}
              {activeBatch.og}
            </p>

            <p className="text-lg mt-2">
              <span className="font-bold">Batchnummer:</span>{" "}
              {activeBatch.batchnummer}
            </p>

            <p className="text-lg mt-4 whitespace-pre-line">
              <span className="font-bold">Oppskrift:</span>{" "}
              {activeBatch.oppskrift.replace(/Notater:[\s\S]*/i, "").trim()}
            </p>

            <p className="text-lg mt-4 whitespace-pre-line">
              <span className="font-bold">Notater:</span>{" "}
              {activeBatch.notater || "Ingen notater"}
            </p>
          </div>
        ) : (
          <p className="opacity-60 text-center mt-10">
            Ingen aktiv batch i dette karet.
          </p>
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg AS.
        </p>
      </div>
    </main>
  );
}
