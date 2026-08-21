"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";
import { getNextMotd } from "../../lib/motd/motdList";

interface KarType {
  id: string;          // UUID fra Supabase
  nummer: number;
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
  const [motd, setMotd] = useState("");

  const menuRef = useRef<HTMLDivElement | null>(null);

  // LOGOUT
  async function logout() {
    await supabaseBrowser.auth.signOut();
    router.replace("/");
  }

  // MOTD
  useEffect(() => {
    setMotd(getNextMotd());
  }, []);

  // HENT TOKEN MED FALLBACK
  async function getToken() {
    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession();

    let token = session?.access_token;

    // Fallback: hent token fra cookie hvis client-session mangler
    if (!token) {
      const cookieToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("sb-access-token="))
        ?.split("=")[1];

      token = cookieToken;
    }

    return token;
  }

  // Felles loader som kan brukes både ved mount og etter createKar
  async function loadDashboardData() {
    const token = await getToken();

    if (!token) {
      console.log("Fant ingen token → redirect");
      router.replace("/");
      return;
    }

    // HENT PROFIL
    const profileRes = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });

    if (!profileRes.ok) {
      router.replace("/");
      return;
    }

    const profileJson = await profileRes.json();
    setUsername(profileJson.username ?? "Ukjent");

    // HENT KAR — bruker token, ikke query-param
    const karRes = await fetch("/api/kar", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });

    if (!karRes.ok) {
      router.replace("/");
      return;
    }

    const karJson: KarType[] = await karRes.json();
    const sorted = [...karJson].sort((a, b) => a.nummer - b.nummer);

    setKar(sorted);
    setLoading(false);
  }

  // LOAD DATA VED MOUNT
  useEffect(() => {
    loadDashboardData();
  }, [router]);

  // MENY CLICK OUTSIDE
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

  // CREATE KAR — nå oppdaterer vi dashboardet direkte etter POST
  async function createKar() {
    const token = await getToken();

    if (!token) {
      router.replace("/");
      return;
    }

    const res = await fetch("/kar/create", {
      method: "POST",
      credentials: "include",
    });

    if (res.ok) {
      await loadDashboardData();
    }
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

      {/* MENY */}
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

            <a
              href="/recipes"
              className="block mb-3 text-white hover:text-green-300 font-semibold"
            >
              Mine oppskrifter
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

      {/* KNAPPER ØVERST */}
      <div className="flex justify-center gap-4 mb-10 mt-4">
        <a
          href="/profiles"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          Se andre bryggere
        </a>

        <a
          href="/recipes"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          Mine oppskrifter
        </a>
      </div>

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-2 text-center">
        Logget inn som {username}
      </h1>

      {/* MOTD */}
      <p className="text-center text-zinc-300 mb-6 italic">
        {motd}
      </p>

      {/* KAROVERSIKT */}
      <h2 className="text-2xl font-semibold mb-4 text-center">
        Karoversikt
      </h2>

      <div className="flex flex-wrap justify-center gap-6">

        {/* KAR-KNAPPER */}
        {kar.map((k, index) => (
          <a
            key={k.id}
            href={`/kar/${k.id}`}
            className="relative border border-white/10 rounded-xl p-4 bg-white/5 w-32 h-32 flex flex-col items-center justify-center hover:bg-white/10 transition overflow-hidden"
          >
            {/* CO2 BOBLER */}
            <div className="bubble-container">
              {[...Array(12)].map((_, i) => (
                <span
                  key={i}
                  className="bubble"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${2 + Math.random() * 3}s`,
                    animationDelay: `${Math.random() * 2}s`,
                    width: `${4 + Math.random() * 6}px`,
                    height: `${4 + Math.random() * 6}px`,
                  }}
                />
              ))}
            </div>

            <span className="text-lg font-bold text-green-300 relative z-10">
              Kar {index + 1}
            </span>

            <span
              className={
                k.status === "Aktiv"
                  ? "text-green-400 font-semibold mt-2 relative z-10"
                  : "text-zinc-400 mt-2 relative z-10"
              }
            >
              {k.status}
            </span>
          </a>
        ))}

        {/* PLUSS-KNAPP */}
        <button
          onClick={createKar}
          className="border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl p-4 w-32 h-32 flex items-center justify-center text-white text-3xl font-bold"
        >
          +
        </button>

      </div>

      {/* COPYRIGHT */}
      <p className="text-sm opacity-40 mt-12 text-center">
        © {new Date().getFullYear()} Fiklebrygg AS.
      </p>
    </div>
  );
}
