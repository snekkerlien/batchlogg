import { createServerComponentClient } from "../../../lib/supabase/supabaseServerFinal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const supabase = await createServerComponentClient();

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

  // Riktig tabell: profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .order("username", { ascending: true });

  const otherProfiles = (profiles ?? []).filter((p) => p.id !== user.id);

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
                href={`/profile/${p.id}`}
                className="block border border-white/10 bg-white/5 hover:bg-white/10 transition rounded-xl p-4 font-semibold text-center"
              >
                {p.username || "Ukjent bruker"}
              </Link>
            ))
          ) : (
            <p className="opacity-60 text-center">Ingen andre brukere funnet.</p>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg AS.
        </p>
      </div>
    </main>
  );
}
