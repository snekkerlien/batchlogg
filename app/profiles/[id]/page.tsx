export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers } from "next/headers";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import Link from "next/link";

export default async function ProfileDetailPage({ params }: { params: { id: string } }) {
  console.log("=== /profiles/[id] START ===");

  // Hent Authorization-header manuelt
  const headerStore = headers();
  const authHeader = headerStore.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  console.log("[/profiles/[id]] Token:", token);

  if (!token) {
    console.log("[/profiles/[id]] Ingen token → ikke innlogget");
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Du må være innlogget</h1>
      </main>
    );
  }

  const { supabase } = supabaseServer();

  console.log("[/profiles/[id]] Henter bruker via JWT...");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  console.log("[/profiles/[id]] User:", user);
  console.log("[/profiles/[id]] UserError:", userError);

  if (!user) {
    console.log("[/profiles/[id]] Ingen bruker → ikke innlogget");
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Du må være innlogget</h1>
      </main>
    );
  }

  console.log("[/profiles/[id]] Henter profil...");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  console.log("[/profiles/[id]] Profile:", profile);
  console.log("[/profiles/[id]] ProfileError:", profileError);

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Profil ikke funnet</h1>
      </main>
    );
  }

  console.log("[/profiles/[id]] Henter kar...");

  const { data: karRaw } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", params.id)
    .order("nummer");

  console.log("[/profiles/[id]] Henter batches...");

  const { data: batchesRaw } = await supabase
    .from("batches")
    .select("*")
    .eq("user_id", params.id);

  console.log("[/profiles/[id]] Henter oppskrifter...");

  const { data: recipesRaw } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", params.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const kar = (karRaw ?? []).map((k: any) => {
    const activeBatch = batchesRaw?.find(
      (b: any) => b.aktivt_kar === k.id && b.status === "Aktiv"
    );

    return {
      id: k.id,
      nummer: k.nummer,
      created_at: k.created_at,
      status: activeBatch ? "Aktiv" : "Ledig",
    };
  });

  console.log("=== /profiles/[id] END ===");

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        <div className="absolute top-4 left-4">
          <Link
            href="/profiles"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ← Tilbake
          </Link>
        </div>

        <div className="absolute top-4 right-4">
          <Link
            href="/account"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ⚙️ Konto
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center">
          {profile.username}
        </h1>

        <p className="opacity-80 text-center mb-10">
          Oversikt over brukerens kar, aktive batches og offentlige oppskrifter.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-center">Kar</h2>

        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {kar.length > 0 ? (
            kar.map((k) => (
              <Link
                key={k.id}
                href={`/profiles/${params.id}/kar/${k.id}`}
                className="border border-white/10 rounded-xl p-4 bg-white/5 w-32 h-32 flex flex-col items-center justify-center hover:bg-white/10 transition"
              >
                <span className="text-lg font-bold text-green-300">
                  Kar {k.nummer}
                </span>

                <span
                  className={
                    k.status === "Aktiv"
                      ? "text-green-400 font-semibold mt-2"
                      : "text-zinc-400 mt-2"
                  }
                >
                  {k.status}
                </span>
              </Link>
            ))
          ) : (
            <p className="opacity-60 text-center">Ingen kar funnet.</p>
          )}
        </div>

        <h2 className="text-2xl font-semibold mb-4 text-center">
          Offentlige oppskrifter
        </h2>

        <div className="space-y-4">
          {recipesRaw && recipesRaw.length > 0 ? (
            recipesRaw.map((r: any) => (
              <div
                key={r.id}
                className="p-4 bg-white/10 border border-white/20 rounded-xl"
              >
                <h3 className="text-xl font-bold text-green-300 mb-2">
                  {r.name}
                </h3>

                <p className="text-sm opacity-80">
                  OG: {r.og} — FG: {r.fg} — ABV: {r.abv.toFixed(1)}%
                </p>

                <p className="text-sm opacity-80 mt-1">
                  Volum: {r.volume} L
                </p>

                {r.notes && (
                  <p className="mt-3 whitespace-pre-line opacity-90">
                    {r.notes}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="opacity-60 text-center">
              Ingen offentlige oppskrifter.
            </p>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg AS.
        </p>
      </div>
    </main>
  );
}
