"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";
import { getNextMotd } from "../../lib/motd/motdList";
import MenuOverlay from "@/app/components/MenuOverlay";


interface KarType {
  id: string;
  nummer: number;
  created_at: string;
  status: "Aktiv" | "Ledig" | "Sekundær";
  batchName?: string | null;
}

interface DashboardResponse {
  username: string;
  maxVessels: number;
  kar: KarType[];
}

function isCreatedKar(
  value: unknown
): value is Pick<KarType, "id" | "nummer" | "created_at"> {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "nummer" in value &&
    typeof value.nummer === "number" &&
    "created_at" in value &&
    typeof value.created_at === "string"
  );
}

export default function DashboardClient() {
 
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [username, setUsername] = useState("");
  const [kar, setKar] = useState<KarType[]>([]);
  const [motd, setMotd] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKars, setSelectedKars] = useState<string[]>([]);
  const [fadeMessage, setFadeMessage] = useState("");
  const [maxVessels, setMaxVessels] = useState(12);
  const [creatingKar, setCreatingKar] = useState(false);
  const [showDashboardInfo, setShowDashboardInfo] = useState(true);
  const [infoPreferenceLoaded, setInfoPreferenceLoaded] = useState(false);

useEffect(() => {
  try {
    setShowDashboardInfo(
      window.localStorage.getItem("dashboard-info-hidden") !== "true"
    );
  } catch (error) {
    console.error("Could not load dashboard info preference", error);
  } finally {
    setInfoPreferenceLoaded(true);
  }
}, []);

useEffect(() => {
  if (!infoPreferenceLoaded) return;

  try {
    window.localStorage.setItem(
      "dashboard-info-hidden",
      String(!showDashboardInfo)
    );
  } catch (error) {
    console.error("Could not save dashboard info preference", error);
  }
}, [showDashboardInfo, infoPreferenceLoaded]);

// ⭐ Hent MOTD ved mount
useEffect(() => {
  setMotd(getNextMotd());
}, []);

// ⭐ Last dashboard-data når router endres
useEffect(() => {
  loadDashboardData();
}, []);

  async function getToken() {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  return session?.access_token || null;
}

  async function loadDashboardData() {
    setLoading(true);
    setLoadError("");

    try {
      const token = await getToken();
      if (!token) {
        router.replace("/");
        return;
      }

      const response = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/");
        return;
      }

      if (!response.ok) {
        throw new Error(`Dashboard request failed (${response.status})`);
      }

      const data: DashboardResponse = await response.json();
      if (!Array.isArray(data.kar)) {
        throw new Error("Dashboard response did not include vessel data");
      }

      setUsername(data.username ?? "Unknown");
      setMaxVessels(data.maxVessels ?? 12);
      setKar(data.kar);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
      setLoadError("Could not load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
    if (creatingKar || kar.length >= maxVessels) return;

    setCreatingKar(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/");
        return;
      }

      const res = await fetch("/kar/create", {
        method: "POST",
        credentials: "include",
      });

      if (res.status === 401) {
        router.replace("/");
        return;
      }

      if (res.status === 409) {
        setFadeMessage(`You have reached your limit of ${maxVessels} vessels`);
        setTimeout(() => setFadeMessage(""), 2500);
        await loadDashboardData();
        return;
      }

      if (!res.ok) {
        throw new Error(`Vessel creation failed (${res.status})`);
      }

      const payload: unknown = await res.json();
      const createdKar =
        typeof payload === "object" && payload !== null && "kar" in payload
          ? payload.kar
          : null;

      if (!isCreatedKar(createdKar)) {
        console.error("Vessel creation response did not include the created vessel");
        setFadeMessage("Vessel was created, but could not be displayed. Please reload.");
        setTimeout(() => setFadeMessage(""), 4000);
        return;
      }

      setKar((current) =>
        current.some((vessel) => vessel.id === createdKar.id)
          ? current
          : [
              ...current,
              {
                id: createdKar.id,
                nummer: createdKar.nummer,
                created_at: createdKar.created_at,
                status: "Ledig",
                batchName: null,
              },
            ]
      );
    } catch (error) {
      console.error("Failed to create vessel", error);
      setFadeMessage("Could not create vessel. Please try again.");
      setTimeout(() => setFadeMessage(""), 2500);
    } finally {
      setCreatingKar(false);
    }
  }

  if (loading) {
  return (
    <main className="min-h-screen flex items-center justify-center text-white">
      <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
        Loading dashboard…
      </div>
    </main>
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
        Logged in as {username}
      </p>  

      <p className="text-center text-zinc-300 mb-10 italic">
        {motd}
      </p>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-500/50 bg-red-700/30 p-4 text-center"
        >
          <p>{loadError}</p>
          <button
            onClick={loadDashboardData}
            className="mt-3 rounded-lg border border-white/20 bg-white/10 px-4 py-2 hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      )}

      <h2 className="text-2xl font-semibold mb-4 text-center">
        Vessel Overview
      </h2>

      <div className="flex flex-wrap justify-center gap-6">
        {kar.map((k) => (
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
    {[...Array(6)].map((_, i) => (
      <span
        key={i}
        className="bubble"
        style={{
          left: `${(i * 37 + 11) % 100}%`,
          animationDuration: `${2 + (i % 3)}s`,
          animationDelay: `${((i * 7) % 20) / 10}s`,
          width: `${4 + (i % 3) * 2}px`,
          height: `${4 + (i % 3) * 2}px`,
        }}
      />
    ))}
  </div>
)}


            <div
              className="text-lg font-bold text-green-300 text-center leading-tight line-clamp-2"
            >
              {k.batchName ?? `Vessel`}
            </div>


            <span
              className="text-zinc-400 font-semibold mt-2 relative z-10"
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
            disabled={creatingKar}
            aria-label={creatingKar ? "Creating vessel" : "Create vessel"}
            className="border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60 disabled:cursor-wait rounded-xl p-4 w-32 h-32 flex items-center justify-center text-white text-3xl font-bold"
          >
            {creatingKar ? "…" : "+"}
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
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold mb-5"
          >
            Select vessels
          </button>
        )}

        {selectMode && (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={deleteSelectedKars}
              disabled={selectedKars.length === 0}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold disabled:opacity-40"
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

      <div className="mt-8 text-center">
        <button
          type="button"
          aria-expanded={showDashboardInfo}
          aria-controls="dashboard-info"
          onClick={() => setShowDashboardInfo((visible) => !visible)}
          className="text-sm text-zinc-400 hover:text-white underline underline-offset-4"
        >
          {showDashboardInfo ? "Hide dashboard info" : "Show dashboard info"}
        </button>
        {showDashboardInfo && (
          <p
            id="dashboard-info"
            className="text-center text-zinc-300 mt-4 mb-10 italic"
          >
            The dashboard gives you a simple overview of all your vessels and their current status. Tap a vessel to open its details, check activity, or make adjustments. Use the + button to add new vessels up to your personal limit, and switch to selection mode when you want to manage several at once.
          </p>
        )}
      </div>

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
