export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "../../lib/supabase/supabaseServerFinal";
import Link from "next/link";

export default async function ProfilesPage() {
  console.log("=== /profiles START ===");

  // Bruk SSR-klienten – den leser cookies selv
  const { supabase } = await supabaseServer();

  console.log("[/profiles] Henter bruker via cookies...");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("[/profiles] User:", user);
  console.log("[/profiles] UserError:", userError);

  if (!user) {
    console.log("[/profiles] Ingen bruker → ikke innlogget");
    console.log("=== /profiles END ===");
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Du må være innlogget</h1>
      </main>
    );
  }

  console.log("[/profiles] Henter profiler fra database...");

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, is_public")   // henter synlighet
    .order("username", { ascending: true });

  console.log("[/profiles] Profiles:", profiles);
  console.log("[/profiles] ProfilesError:", profilesError);

  if (profilesError) {
    console.log("=== /profiles END === (feil)");
    return (
      <main className="min-h-screen flex items-center justify-center text-red-400">
        <h1 className="text-2xl font-bold">
          Feil ved henting av profiler: {profilesError.message}
        </h1>
      </main>
    );
  }

  // filtrer bort egen bruker + private profiler
  const otherProfiles = (profiles ?? [])
    .filter((p) => p.id !== user.id)
    .filter((p) => p.is_public === true);

  console.log("[/profiles] Filtrerte profiler:", otherProfiles);
  console.log("=== /profiles END ===");

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        {/* Tilbake-knapp */}
        <div className="absolute top-4 left-4">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ← Tilbake
          </Link>
        </div>

        {/* Konto-knapp */}
        <div className="absolute top-4 right-4">
          <Link
            href="/account"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ⚙️ Konto
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center">Profiler</h1>

        <p className="opacity-80 text-center mb-10">
          Velg en bruker for å se deres kar og aktive batches.
        </p>

        <div className="max-w-xl mx-auto space-y-4">
          {otherProfiles.length > 0 ? (
            otherProfiles.map((p) => (
              <Link
                key={p.id}
                href={`/profiles/${p.username}`}
                className="block border border-white/10 bg-white/5 hover:bg-white/10 transition rounded-xl p-4 font-semibold text-center"
              >
                {p.username
                  ? p.username.charAt(0).toUpperCase() + p.username.slice(1)
                  : "Ukjent bruker"}
              </Link>
            ))
          ) : (
            <p className="opacity-60 text-center">Ingen offentlige brukere funnet.</p>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg - Batchlogg
        </p>
      </div>
    </main>
  );
}
