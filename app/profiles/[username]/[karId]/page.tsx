export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../../../lib/supabase/supabaseServerFinal";
import Link from "next/link";

export default async function KarDetailPage({
  params,
}: {
  params: { username: string; karId: string };
}) {
  const { supabase } = supabaseServer();

  // ⭐ Sjekk innlogging
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

  // ⭐ Finn bruker via username
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single();

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Profil ikke funnet</h1>
      </main>
    );
  }

  const userId = profile.id;

  // ⭐ Finn karet via ekte karId
  const { data: kar } = await supabase
    .from("kar")
    .select("*")
    .eq("id", params.karId)
    .eq("user_id", userId)
    .single();

  if (!kar) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Kar ikke funnet</h1>
      </main>
    );
  }

  // ⭐ Finn batcher knyttet til karet
  const { data: batches } = await supabase
    .from("batches")
    .select("*")
    .eq("aktivt_kar", kar.id)
    .eq("user_id", userId);

  const activeBatch = batches?.find((b) => b.status === "Aktiv");
  const secondaryBatch = batches?.find((b) => b.status === "Sekundær");

  const now = Date.now();

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        {/* TILBAKE */}
        <div className="absolute top-4 left-4">
          <Link
            href={`/profiles/${params.username}`}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ← Tilbake
          </Link>
        </div>

        {/* HEADER */}
        <h1 className="text-4xl font-bold mb-6 text-center">
          Kar {kar.nummer}
        </h1>

        <p className="opacity-80 text-center mb-10">
          Oversikt over {params.username}s batch i kar {kar.nummer}.
        </p>

        {/* ⭐ KARSTATUS */}
        <div className="mb-10 p-4 bg-white/5 border border-white/10 rounded-xl">
          <h2 className="text-2xl font-semibold mb-4">Karstatus</h2>

          {activeBatch ? (
            <>
              <p className="text-lg">
                <span className="font-bold">Status:</span>{" "}
                <span className="text-green-400">Aktiv</span>
              </p>

              <p className="text-lg mt-2">
                <span className="font-bold">Startet:</span>{" "}
                {new Date(activeBatch.startdato).toLocaleDateString("no-NO")}
              </p>
            </>
          ) : secondaryBatch ? (
            <>
              <p className="text-lg">
                <span className="font-bold">Status:</span>{" "}
                <span className="text-yellow-400">Sekundær</span>
              </p>

              <p className="text-lg mt-2">
                <span className="font-bold">Startet sekundær:</span>{" "}
                {new Date(
                  secondaryBatch.secondary_startdate
                ).toLocaleDateString("no-NO")}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg">
                <span className="font-bold">Status:</span>{" "}
                <span className="text-zinc-400">Ledig</span>
              </p>

              <p className="text-lg mt-2">
                <span className="font-bold">Historikk:</span>{" "}
                Ingen aktiv batch i dette karet
              </p>
            </>
          )}
        </div>

        {/* ⭐ BATCHDETALJER */}
        {activeBatch ? (
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h2 className="text-2xl font-semibold mb-4">Aktiv batch</h2>

            <p className="text-lg">
              <span className="font-bold">Navn:</span> {activeBatch.name}
            </p>

            <p className="text-lg mt-2">
              <span className="font-bold">Startet:</span>{" "}
              {new Date(activeBatch.startdato).toLocaleDateString("no-NO")}
            </p>

            <p className="text-lg mt-2">
              <span className="font-bold">Volum:</span>{" "}
              {activeBatch.volume_l} L
            </p>

            <p className="text-lg mt-2">
              <span className="font-bold">OG:</span> {activeBatch.og}
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
        ) : secondaryBatch ? (
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h2 className="text-2xl font-semibold mb-4">Sekundær batch</h2>

            <p className="text-lg">
              <span className="font-bold">Navn:</span> {secondaryBatch.name}
            </p>

            <p className="text-lg mt-2">
              <span className="font-bold">Startet sekundær:</span>{" "}
              {new Date(
                secondaryBatch.secondary_startdate
              ).toLocaleDateString("no-NO")}
            </p>

            <p className="text-lg mt-2">
              <span className="font-bold">Status:</span>{" "}
              {secondaryBatch.status}
            </p>
          </div>
        ) : (
          <p className="opacity-60 text-center mt-10">
            Ingen aktiv batch i dette karet.
          </p>
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg - Batchlogg
        </p>
      </div>
    </main>
  );
}
