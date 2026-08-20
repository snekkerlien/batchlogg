"use client";

import { useEffect, useState, useRef } from "react";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Kar = {
  id: number;
  user_id: string;
  navn: string;
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

  // 🔥 Close-on-outside-click
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
      // Hent brukernavn
      const { data: profile } = await supabaseBrowser
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      setUsername(profile?.username ?? "Ukjent bruker");

      // Hent kar
      const { data: karData } = await supabaseBrowser
        .from("kar")
        .select("*")
        .eq("user_id", userId)
        .order("id");

      setKar((karData as Kar[]) || []);

      // Hent batcher
      const { data: batchData } = await supabaseBrowser
        .from("Batches")
        .select("*")
        .eq("user_id", userId)
        .order("startdato", { ascending: false });

      setBatches((batchData as Batch[]) || []);

      // Finn aktive kar
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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Laster profil…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">

      {/* --- MENY KNAPP --- */}
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

      {/* Hjem-knapp */}
      <Link
        href="/dashboard"
        prefetch={false}
        className="block mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold w-fit"
      >
        🏠 Hjem
      </Link>

      {/* Tilbake-knapp */}
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

      {/* KAR-OVERSIKT */}
      <h2 className="text-2xl font-semibold mb-4 text-center">
        Karoversikt
      </h2>

      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {kar.map((k) => {
          const aktiv = aktiveKar.has(k.id);

          return (
            <div
              key={k.id}
              className="relative border border-white/10 rounded-xl p-4 bg-white/5 flex flex-col items-center w-28 h-28"
            >
              {aktiv && (
                <div className="absolute inset-0 pointer-events-none bubble-animation"></div>
              )}

              <Link
                href={`/kar/${k.id}`}
                prefetch={false}
                className="flex flex-col items-center mb-2 relative"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-300"
                >
                  <path d="M4 4h16v2H4z" />
                  <path d="M6 6v11a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5V6" />
                  <path d="M9 10h6" />
                  <path d="M12 2v2" />
                  <circle cx="12" cy="2" r="1" />
                </svg>

                <span className="absolute top-[10px] text-lg font-bold text-green-300">
                  {k.navn.replace("Kar ", "")}
                </span>
              </Link>

              {aktiv ? (
                <span className="text-green-400 font-semibold">
                  Aktiv
                </span>
              ) : (
                <span className="text-zinc-400">Ledig</span>
              )}
            </div>
          );
        })}
      </div>

      {/* BATCHES */}
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

      <style>{`
        .bubble-animation {
          background-image: radial-gradient(circle, rgba(255,255,255,0.2) 2px, transparent 2px);
          background-size: 20px 20px;
          animation: bubble 2s infinite linear;
        }

        @keyframes bubble {
          from { background-position: 0 0; }
          to { background-position: 0 -40px; }
        }
      `}</style>
    </main>
  );
}
