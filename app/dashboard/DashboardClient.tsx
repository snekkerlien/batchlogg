"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";

interface KarType {
  id: number;
  nummer: number;
  displayNummer: number;
  user_id: string;
  created_at: string;
  status: "Aktiv" | "Ledig";
}

export default function DashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [kar, setKar] = useState<KarType[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKars, setSelectedKars] = useState<number[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fetch data from API using client-side session
  useEffect(() => {
    async function loadData() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const token = session.access_token;

      // Fetch profile
      const profileRes = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!profileRes.ok) {
        router.replace("/auth/login");
        return;
      }

      const profileJson = await profileRes.json();
      setUsername(profileJson.username ?? "Ukjent");

      // Fetch kar
      const karRes = await fetch("/api/kar?user=" + session.user.id, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!karRes.ok) {
        router.replace("/auth/login");
        return;
      }

      const karJson = await karRes.json();
      setKar(karJson);

      setLoading(false);
    }

    loadData();
  }, [router]);

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

  function toggleSelect(id: number) {
    setSelectedKars((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

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

  async function createKar() {
    await fetch("/kar/create", { method: "POST" });
    router.refresh();
  }

  async function logout() {
    await supabaseBrowser.auth.signOut();
    router.replace("/auth/login");
  }

  if (loading) {
    return (
      <div className="text-center text-white mt-20 text-xl">
        Laster dashboard…
      </div>
    );
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

            <button
              onClick={logout}
              className="text-red-400 hover:text-red-300 font-semibold"
            >
              Logg ut
            </button>
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
              const isLocked = k.nummer === 1;

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
