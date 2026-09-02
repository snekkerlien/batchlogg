"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";
import { getNextMotd } from "../../lib/motd/motdList";
import MenuOverlay from "@/app/components/MenuOverlay";


interface KarType {
  id: string;
  nummer: number;
  user_id: string;
  created_at: string;
  status: "Aktiv" | "Ledig" | "Sekundær";
}

export default function DashboardClient() {
 
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [kar, setKar] = useState<KarType[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [motd, setMotd] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKars, setSelectedKars] = useState<string[]>([]);
  const [fadeMessage, setFadeMessage] = useState("");
  const [maxVessels, setMaxVessels] = useState(12);
  const [showHelp, setShowHelp] = useState(false);


  const menuRef = useRef<HTMLDivElement | null>(null);

  async function logout() {
    await supabaseBrowser.auth.signOut();
    router.replace("/");
  }

// ⭐ Hent MOTD ved mount
useEffect(() => {
  setMotd(getNextMotd());
}, []);

// ⭐ Last dashboard-data når router endres
useEffect(() => {
  loadDashboardData();
}, [router]);

// ⭐ Klikk utenfor menyen lukker den
useEffect(() => {
  function handleClickOutside(e: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession();

    let token = session?.access_token;

    if (!token) {
      const cookieToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("sb-access-token="))
        ?.split("=")[1];

      token = cookieToken;
    }

    return token;
  }

  async function loadDashboardData() {
    const token = await getToken();
    if (!token) {
      router.replace("/");
      return;
    }

    const profileRes = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });

    if (!profileRes.ok) {
      router.replace("/");
      return;
    }

    const profileJson = await profileRes.json();
    setUsername(profileJson.username ?? "Unknown");

    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession();

    const currentUserId = session?.user?.id;

    if (currentUserId) {
      const { data: profile } = await supabaseBrowser
        .from("profiles")
        .select("max_vessels")
        .eq("id", currentUserId)
        .single();

      setMaxVessels(profile?.max_vessels ?? 12);
    }

    const karRes = await fetch("/api/kar", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });

    const karJson: KarType[] = await karRes.json();

    const owned = karJson.filter((k) => k.user_id === currentUserId);

    const batchRes = await fetch("/api/batches", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });

    const batches = batchRes.ok ? await batchRes.json() : [];

    const karWithStatus = owned.map((k) => {
      const batch = batches
        .filter((b: any) => b.aktivt_kar === k.id)
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )[0];

      let status: "Ledig" | "Aktiv" | "Sekundær" = "Ledig";

      if (batch) {
        if (batch.status === "Avsluttet") {
          status = "Ledig";
        } else if (batch.status === "Sekundær") {
          status = "Sekundær";
        } else {
          status = "Aktiv";
        }
      }

      return { ...k, status };
    });

    const sorted = [...karWithStatus].sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

    setKar(sorted);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboardData();
  }, [router]);


  function toggleSelectMode() {
    setSelectMode(!selectMode);
    setSelectedKars([]);
  }

  function toggleKarSelection(id: string, nummer: number) {
    if (nummer === 1) {
      setFadeMessage("Vessel 1 cannot be deleted");
      setTimeout(() => setFadeMessage(""), 1500);
      return;
    }

    setSelectedKars((prev) =>
      prev.includes(id)
        ? prev.filter((k) => k !== id)
        : [...prev, id]
    );
  }

  async function deleteSelectedKars() {
    const token = await getToken();

    await fetch("/kar/delete-multiple", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({ ids: selectedKars }),
    });

    await supabaseBrowser.auth.refreshSession();
    await supabaseBrowser.auth.getSession();
    await loadDashboardData();
    toggleSelectMode();
  }

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
      await supabaseBrowser.auth.refreshSession();
      await supabaseBrowser.auth.getSession();
      await loadDashboardData();
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="text-center text-white mt-20 text-xl">
        Loading dashboard…
      </div>
    );
  }

  

  return (
    <div className="bg-black/60 backdrop-blur-md p-6 sm:p-8 rounded-xl border border-white/10 max-w-3xl mx-auto mt-20 sm:mt-24 relative">
      {fadeMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/80 text-white px-4 py-2 rounded-lg animate-fadeOut z-50">
          {fadeMessage}
        </div>
      )}

      {/* MENU */}
      <div className="absolute top-4 right-4 z-50">
        <MenuOverlay current="dashboard" />
      </div>

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-4 mt-15 text-center">
        Ferment-station
      </h1>

      <p className="text-center text-zinc-300 mb-7">
        Logget in as {username}
      </p>  

      <p className="text-center text-zinc-300 mb-10 italic">
        {motd}
      </p>

      <h2 className="text-2xl font-semibold mb-4 text-center">
        Vessel Overview
      </h2>

      <div className="flex flex-wrap justify-center gap-6">
        {kar.map((k, index) => (
          <a
            key={k.id}
            href={selectMode ? "#" : `/kar/${k.id}`}
            onClick={(e) => {
              if (selectMode) {
                e.preventDefault();

                if (k.nummer === 1) {
                  setFadeMessage("Fermentation Vessel 1 cannot be deleted");
                  setTimeout(() => setFadeMessage(""), 1500);
                } else {
                  toggleKarSelection(k.id, k.nummer);
                }
              }
            }}
            className={`relative border border-white/10 rounded-xl p-4 bg-white/5 w-32 h-32 flex flex-col items-center justify-center transition overflow-hidden
              ${selectMode ? "animate-fadeIn" : ""}
              ${
                selectMode && selectedKars.includes(k.id)
                  ? "ring-4 ring-red-500"
                  : ""
              }
              ${
                selectMode && k.nummer === 1
                  ? "opacity-40 cursor-not-allowed pointer-events-none animate-shake"
                  : ""
              }
              hover:bg-white/10
            `}
          >
            {/* ⭐ Only show bubbles when the vessel has an active batch */}
{(k.status === "Aktiv" || k.status === "Sekundær") && (
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
)}


            <span className="text-lg font-bold text-green-300 relative z-10">
              Vessel {index + 1}
            </span>

            <span
              className={
                k.status === "Aktiv"
                  ? "text-green-400 font-semibold mt-2 relative z-10"
                  : k.status === "Sekundær"
                  ? "text-yellow-400 font-semibold mt-2 relative z-10"
                  : "text-zinc-400 mt-2 relative z-10"
              }
            >
              {k.status === "Aktiv"
                ? "Primary"
                : k.status === "Sekundær"
                ? "Secondary"
                : "Empty"}
            </span>
          </a>
        ))}

        {!selectMode && kar.length < maxVessels && (
          <button
            onClick={createKar}
            className="border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl p-4 w-32 h-32 flex items-center justify-center text-white text-3xl font-bold"
          >
            +
          </button>
        )}
      </div>

      <p className="text-center mt-5 opacity-60">
  Max vessels: {maxVessels}
</p>

      <div className="flex justify-center mt-10 mb-6">
        {!selectMode && (
          <button
            onClick={toggleSelectMode}
            className="px-6 py-3 bg-red-700 hover:bg-red-600 border border-red-500 rounded-lg font-semibold mb-5"
          >
            Select vessels
          </button>
        )}

        {selectMode && (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={deleteSelectedKars}
              disabled={selectedKars.length === 0}
              className="px-6 py-3 bg-red-700 hover:bg-red-600 border border-red-500 rounded-lg font-semibold disabled:opacity-40"
            >
              Delete selected
            </button>

            <button
              onClick={toggleSelectMode}
              className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 border border-zinc-500 rounded-lg font-semibold"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-zinc-300 mb-10 italic">
        The dashboard gives you a simple overview of all your vessels and their current status. Tap a vessel to open its details, check activity, or make adjustments. Use the + button to add new vessels up to your personal limit, and switch to selection mode when you want to manage several at once. Status colors help you quickly see which vessels are active, secondary, or idle, keeping everything easy to follow at a glance.
      </p>

      <p className="text-center text-zinc-300 mb-10 italic">
        You can access your recipes, batch history, the community, your account and our BrewCompanion AI Recipe builder through the menu!
      </p>

      <p className="text-sm opacity-40 mb-2 mt-12 text-center">
        © {new Date().getFullYear()} Batchlog
      </p>

      

      <style jsx>{`
        @keyframes shake {
          0% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-6px);
          }
          40% {
            transform: translateX(6px);
          }
          60% {
            transform: translateX(-4px);
          }
          80% {
            transform: translateX(4px);
          }
          100% {
            transform: translateX(0);
          }
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }

        @keyframes fadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        .animate-fadeOut {
          animation: fadeOut 1.5s forwards;
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
          .bubble-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.bubble {
  position: absolute;
  bottom: -28px;
  background: rgba(223, 228, 226, 0.28); /* tydelig, men ikke sterk */
  border-radius: 50%;
  filter: blur(1.2px); /* smooth, moderne */
  animation-name: sleekRise;
  animation-timing-function: linear; /* jevn hastighet */
  animation-iteration-count: infinite;
  opacity: 0;
}

@keyframes sleekRise {
  0% {
    transform: translateY(0) scale(0.8);
    opacity: 0;
  }
  20% {
    opacity: 0.45; /* subtil, men synlig */
  }
  60% {
    opacity: 0.55; /* peak, men ikke for sterk */
  }
  100% {
    transform: translateY(-150px) scale(1.05);
    opacity: 0;
  }
}

      `}</style>
    </div>
  );
}
