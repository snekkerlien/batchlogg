"use client";

import { useEffect, useState, useRef } from "react";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Kar = {
  id: number;
  user_id: string;
  nummer: number;
};

type Batch = {
  id: number;
  user_id: string;
  aktivt_kar: number;
  batchnummer: string;
  name: string;
  volume_l: number;
  startdato: string;
  status: string;
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = String(params.user_id);

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [kar, setKar] = useState<Kar[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [aktiveKar, setAktiveKar] = useState<Set<number>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close-on-outside-click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabaseBrowser
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      setUsername(profile?.username ?? "Ukjent bruker");

      const { data: karData } = await supabaseBrowser
        .from("kar")
        .select("*")
        .eq("user_id", userId)
        .order("nummer");

      setKar((karData as Kar[]) || []);

      const { data: batchData } = await supabaseBrowser
        .from("batches")
        .select("*")
        .eq("user_id", userId)
        .order("startdato", { ascending: false });

      setBatches((batchData as Batch[]) || []);

      const aktivSet = new Set(
        (batchData as Batch[] | null)
          ?.filter((b) => b.status === "Aktiv")
          .map((b) => b.aktivt_kar) ?? []
      );

      setAktiveKar(aktivSet);

      setLoading(false);
    }

    load();
  }, [userId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <p>Laster profil…</p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen text-white px-6 py-12 bg-cover bg-center"
      style={{ backgroundImage: "url('/bg-texture.webp')" }}
    >
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl mx-auto border border-white/10 relative">

        {/* Meny */}
        <div className="absolute top-4 right-4 z-50" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ☰
          </button>

          {menuOpen && (
            <div className="mt-2 bg-black/80 border border-white/20 rounded-lg p-4 text-right backdrop-blur-md">
              <Link
                href="/account"
                prefetch={false}
                className="block mb-3 text-white hover:text-green-300 font-semibold"
              >
                Min konto
              </Link>

              <form action="/logout" method="post">
                <button className="text-red-400 hover:text-red-300 font-semibold">
                  Logg ut
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Hjem */}
        <Link
          href="/dashboard"
          prefetch={false}
          className="block mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold w-fit"
        >
          🏠 Hjem
        </Link>

        {/* Tilbake */}
        <button
          onClick={() => router.back()}
          className="block mb-8 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold w-fit"
        >
          ← Tilbake
        </button>

        <h1 className="text-4xl font-bold mb-2 text-center">{username}</h1>

        <p className="opacity-80 text-center mb-10">
          Offentlig bryggeprofil
        </p>

        {/* KAROVERSIKT */}
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Karoversikt
        </h2>

        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {kar.map((k) => {
            const aktiv = aktiveKar.has(k.id);

            return (
              <Link
                key={k.id}
                href={`/kar/${k.id}`}
                prefetch={false}
                className="border border-white/10 rounded-xl p-4 bg-white/5 w-32 h-32 flex flex-col items-center justify-center hover:bg-white/10 transition"
              >
                <span className="text-lg font-bold text-green-300">
                  Kar {k.nummer}
                </span>

                <span
                  className={
                    aktiv
                      ? "text-green-400 font-semibold mt-2"
                      : "text-zinc-400 mt-2"
                  }
                >
                  {aktiv ? "Aktiv" : "Ledig"}
                </span>
              </Link>
            );
          })}
        </div>

        {/* BATCHER */}
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Batcher
        </h2>

        <div className="max-w-xl mx-auto space-y-6">
          {batches.map((b) => (
            <div
              key={b.id}
              className="border border-white/10 p-6 rounded-xl bg-white/5"
            >
              <p className="text-xl font-semibold">{b.name}</p>
              <p className="opacity-70">Batch #{b.batchnummer}</p>
              <p className="opacity-70">Volum: {b.volume_l} L</p>
              <p className="opacity-70">Startet: {b.startdato}</p>

              <Link
                href={`/kar/${b.aktivt_kar}`}
                prefetch={false}
                className="mt-4 inline-block px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 font-semibold"
              >
                Gå til kar →
              </Link>
            </div>
          ))}
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg.
        </p>
      </div>
    </main>
  );
}
