"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
};

export default function ProfilesPage() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Laster profiler…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      {/* Hjem-knapp */}
      <a
        href="/dashboard"
        className="block mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold w-fit"
      >
        🏠 Hjem
      </a>

      {/* Tilbake-knapp */}
      <button
        onClick={() => window.history.back()}
        className="block mb-8 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold w-fit"
      >
        ← Tilbake
      </button>

      <h1 className="text-4xl font-bold mb-6 text-center">Profiler</h1>

      <p className="opacity-80 text-center mb-10">
        Velg en bruker for å se deres kar og aktive batches.
      </p>

      <div className="max-w-xl mx-auto space-y-4">
        {profiles.map((p) => (
          <a
            key={p.id}
            href={`/profile/${p.id}`}
            className="block border border-white/10 bg-white/5 hover:bg-white/10 transition rounded-xl p-4 font-semibold text-center"
          >
            {p.username || "Ukjent bruker"}
          </a>
        ))}
      </div>

      <p className="text-sm opacity-40 mt-12 text-center">
        © {new Date().getFullYear()} Fiklebrygg. Brukeroversikt.
      </p>
    </main>
  );
}
