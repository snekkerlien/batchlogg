"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface KarType {
  id: number;
  nummer: number;          // ekte nummer
  displayNummer: number;   // visningsnummer
  user_id: string;
  created_at: string;
  status: "Aktiv" | "Ledig";
}

interface DashboardClientProps {
  username: string;
  kar: KarType[];
}

export default function DashboardClient({ username, kar }: DashboardClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // Close menu when clicking outside
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

  return (
    <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl border border-white/10 max-w-3xl mx-auto mt-16 relative">

      {/* --- MENY KNAPP ØVERST TIL HØYRE --- */}
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

      {/* --- HEADER --- */}
      <h1 className="text-3xl font-bold mb-6 text-center">
        Logget inn som {username}
      </h1>

      {/* --- KNAPPER --- */}
      <div className="flex justify-center gap-4 mb-10">
        <Link
          href="/profiles"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          Se andre bryggere
        </Link>

        <Link
          href="/kar"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          Velg kar
        </Link>
      </div>

      {/* --- KAROVERSIKT --- */}
      <h2 className="text-2xl font-semibold mb-4 text-center">
        Karoversikt
      </h2>

      <div className="flex flex-wrap justify-center gap-6">
        {kar.map((k) => (
          <Link
            key={k.id}
            href={`/kar/${k.id}`}
            className="border border-white/10 rounded-xl p-4 bg-white/5 w-32 h-32 flex flex-col items-center justify-center hover:bg-white/10 transition"
          >
            <span className="text-lg font-bold text-green-300">
              Kar {k.displayNummer}
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
        ))}

        {/* Nytt kar */}
        <button
          onClick={() => {
            router.push("/kar/new");
            router.refresh();
          }}
          className="border border-white/10 rounded-xl p-4 bg-white/5 w-32 h-32 flex flex-col items-center justify-center hover:bg-white/10 transition"
        >
          <span className="text-3xl font-bold text-green-300">+</span>
          <span className="text-zinc-400 mt-2">Nytt kar</span>
        </button>
      </div>
    </div>
  );
}
