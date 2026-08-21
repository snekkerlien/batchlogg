"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface KarType {
  id: number;
  nummer: number;          // ekte nummer
  displayNummer: number;   // UI-nummer
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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKars, setSelectedKars] = useState<number[]>([]);
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

  // Toggle selection
  function toggleSelect(id: number) {
    setSelectedKars((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Delete selected
  async function deleteSelected() {
    if (selectedKars.length === 0) return;

    const res = await fetch("/kar/delete-multiple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedKars }),
    });

    if (res.ok) {
      setSelectMode(false);
      setSelectedKars([]);
      router.refresh();
    }
  }

  // Create new kar
  async function createKar() {
    await fetch("/kar/create", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl border border-white/10 max-w-3xl mx-auto mt-16 relative">

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
            <a
              href="/account"
              className="block mb-3 text-white hover:text-green-300 font-semibold"
            >
              Min konto
            </a>

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
        <a
          href="/profiles"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          Se andre bryggere
        </a>

        <button
          onClick={() => setSelectMode(true)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          Velg kar
        </button>
      </div>

      {/* --- SELECT MODE UI --- */}
      {selectMode && (
        <div className="mb-10 p-4 bg-black/40 border border-white/10 rounded-xl">
          <h3 className="text-xl font-semibold mb-4 text-center">
            Velg kar for sletting
          </h3>

          <div className="flex flex-wrap justify-center gap-6">
            {kar.map((k) => {
              const isLocked = k.nummer === 1; // Kar 1 låst

              return (
                <button
                  key={k.id}
                  onClick={() => {
                    if (!isLocked) toggleSelect(k.id);
                  }}
                  disabled={isLocked}
                  className={`border rounded-xl p-4 w-32 h-32 flex flex-col items-center justify-center transition
                    ${
                      isLocked
                        ? "bg-gray-700/40 border-gray-600 cursor-not-allowed opacity-60"
                        : selectedKars.includes(k.id)
                        ? "bg-red-600/40 border-red-500"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                >
                  <span className="text-lg font-bold text-green-300">
                    Kar {k.displayNummer}
                  </span>

                  <span
                    className={`mt-2 ${
                      isLocked ? "text-gray-400" : "text-zinc-400"
                    }`}
                  >
                    {isLocked ? "Låst" : k.status}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={deleteSelected}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 border border-red-500 rounded-lg font-semibold"
            >
              Slett valgte
            </button>

            <button
              onClick={() => {
                setSelectMode(false);
                setSelectedKars([]);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* --- KAROVERSIKT (normal mode) --- */}
      {!selectMode && (
        <>
          <h2 className="text-2xl font-semibold mb-4 text-center">
            Karoversikt
          </h2>

          <div className="flex flex-wrap justify-center gap-6">
            {kar.map((k) => (
              <a
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
              </a>
            ))}

            {/* Nytt kar – vises kun hvis bruker har mindre enn 12 kar */}
            {kar.length < 12 && (
              <button
                onClick={createKar}
                className="border border-white/10 rounded-xl p-4 bg-white/5 w-32 h-32 flex flex-col items-center justify-center hover:bg-white/10 transition"
              >
                <span className="text-3xl font-bold text-green-300">+</span>
                <span className="text-zinc-400 mt-2">Nytt kar</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
