"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";

type Profile = {
  id: string;
  username: string | null;
};

export default function ProfilesPage() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabaseBrowser
        .from("public_profiles")
        .select("id, username")
        .order("username", { ascending: true });

      setProfiles((data as Profile[]) || []);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-black text-white">
        <p>Laster profiler…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">

      {/* Tilbake-knapp */}
      <div className="absolute top-4 left-4">
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          ← Tilbake
        </Link>
      </div>

      {/* Container */}
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 text-center">

        <h1 className="text-4xl font-bold mb-6">Profiler</h1>

        <p className="opacity-80 mb-10 text-lg">
          Velg en bruker for å se deres kar og aktive batches.
        </p>

        {/* LISTE OVER BRUKERE */}
        <div className="max-w-xl mx-auto space-y-4">
          {profiles.length > 0 ? (
            profiles.map((p) => (
              <Link
                key={p.id}
                href={`/profile/${p.id}`}
                className="block border border-white/10 bg-white/5 hover:bg-white/10 transition rounded-xl p-4 font-semibold text-center"
              >
                {p.username || "Ukjent bruker"}
              </Link>
            ))
          ) : (
            <p className="opacity-60">Ingen brukere funnet.</p>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12">
          © {new Date().getFullYear()} Fiklebrygg AS.
        </p>
      </div>
    </main>
  );
}
