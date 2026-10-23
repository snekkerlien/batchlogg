"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";
import { getNextMotd } from "../../lib/motd/motdList";
import MenuOverlay from "@/app/components/MenuOverlay";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import PageHeading from "@/app/components/PageHeading";
import FermentationBubbles from "@/app/components/FermentationBubbles";
import DashboardGuide from "./DashboardGuide";


interface KarType {
  id: string;
  nummer: number;
  created_at: string;
  status: "Aktiv" | "Ledig" | "Sekundær" | "Conditioning";
  batchName?: string | null;
  activeBatchId?: string | null;
  latestReading?: { sg: number | string; created_at: string } | null;
  nextReminder?: {
    type: "manual" | "sg_check";
    message: string;
    remind_at: string;
  } | null;
  isShared: boolean;
}

interface DashboardResponse {
  username: string;
  maxVessels: number;
  kar: KarType[];
  sharedKar: (KarType & { ownerUsername: string })[];
}

function sharedVesselName(vessel: KarType & { ownerUsername: string }): string {
  if (vessel.batchName) return vessel.batchName;
  return `Vessel ${vessel.nummer}`;
}

function vesselStageLabel(status: KarType["status"]): string {
  if (status === "Aktiv") return "Primary fermentation";
  if (status === "Sekundær") return "Secondary fermentation";
  if (status === "Conditioning") return "Conditioning";
  return "Empty vessel";
}

const sharedVesselCardStyle = {
  borderColor: "var(--user-accent)",
  boxShadow:
    "0 0 0 1px var(--user-accent), 0 0 8px color-mix(in srgb, var(--user-accent) 30%, transparent)",
};

const sharedVesselIconStyle = {
  borderColor: "var(--user-accent)",
  backgroundColor: "#09090b",
  color: "var(--user-accent)",
  boxShadow: "0 0 4px color-mix(in srgb, var(--user-accent) 45%, transparent)",
};

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
  const [sharedKar, setSharedKar] = useState<
    (KarType & { ownerUsername: string })[]
  >([]);
  const [motd, setMotd] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKars, setSelectedKars] = useState<string[]>([]);
  const [confirmDeleteVessels, setConfirmDeleteVessels] = useState(false);
  const [sharedVesselToLeave, setSharedVesselToLeave] = useState<
    (KarType & { ownerUsername: string }) | null
  >(null);
  const [leavingSharedVessel, setLeavingSharedVessel] = useState(false);
  const [fadeMessage, setFadeMessage] = useState("");
  const [maxVessels, setMaxVessels] = useState(6);
  const [creatingKar, setCreatingKar] = useState(false);
  const [movingBatchId, setMovingBatchId] = useState<string | null>(null);
  const [moveSourceVesselId, setMoveSourceVesselId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    sourceVesselId: string;
    targetVesselId: string;
  } | null>(null);
  const [moveNotice, setMoveNotice] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);
  const dashboardLoadInProgress = useRef(false);
  const lastSilentDashboardLoad = useRef(0);

// ⭐ Hent MOTD ved mount
useEffect(() => {
  setMotd(getNextMotd());
}, []);

// ⭐ Last dashboard-data når router endres
useEffect(() => {
  loadDashboardData();

  // Page may be kept alive by the router cache/bfcache, so refetch when it becomes visible again
  const refresh = () => {
    if (document.visibilityState === "visible") loadDashboardData(true);
  };
  const onPageShow = () => loadDashboardData(true);

  window.addEventListener("focus", refresh);
  window.addEventListener("pageshow", onPageShow);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    window.removeEventListener("focus", refresh);
    window.removeEventListener("pageshow", onPageShow);
    document.removeEventListener("visibilitychange", refresh);
  };
}, []);

  async function getToken() {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  return session?.access_token || null;
}

  async function loadDashboardData(silent = false) {
    if (dashboardLoadInProgress.current) return;
    if (
      silent &&
      Date.now() - lastSilentDashboardLoad.current < 15_000
    ) {
      return;
    }
    dashboardLoadInProgress.current = true;
    if (silent) lastSilentDashboardLoad.current = Date.now();
    if (!silent) setLoading(true);
    setLoadError("");

    try {
      const token = await getToken();
      if (!token) {
        router.replace("/auth/login?redirect=/dashboard");
        return;
      }

      const response = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/auth/login?redirect=/dashboard");
        return;
      }

      if (!response.ok) {
        throw new Error(`Dashboard request failed (${response.status})`);
      }

      const data: DashboardResponse = await response.json();
      if (!Array.isArray(data.kar) || !Array.isArray(data.sharedKar)) {
        throw new Error("Dashboard response did not include vessel data");
      }

      setUsername(data.username ?? "Unknown");
      setMaxVessels(data.maxVessels);
      setKar(data.kar);
      setSharedKar(data.sharedKar);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
      setLoadError("Could not load your dashboard. Please try again.");
    } finally {
      dashboardLoadInProgress.current = false;
      setLoading(false);
    }
  }

  function toggleSelectMode() {
    setSelectMode(!selectMode);
    setSelectedKars([]);
    setMoveSourceVesselId(null);
    setPendingMove(null);
  }

  function toggleKarSelection(id: string) {
    setSelectedKars((prev) =>
      prev.includes(id)
        ? prev.filter((k) => k !== id)
        : [...prev, id]
    );
  }

  const selectedActiveBatches = kar.filter(
    (vessel) =>
      selectedKars.includes(vessel.id) &&
      vessel.activeBatchId &&
      (vessel.status === "Aktiv" || vessel.status === "Sekundær" || vessel.status === "Conditioning")
  );

  const deleteConfirmationMessage =
    selectedActiveBatches.length > 0
      ? `Deleting these vessels will also cancel and permanently delete ${
          selectedActiveBatches.length === 1
            ? `the active batch “${selectedActiveBatches[0].batchName || "Unnamed batch"}” and its notes`
            : `${selectedActiveBatches.length} active batches (${selectedActiveBatches
                .map((vessel) => vessel.batchName || "Unnamed batch")
                .join(", ")}) and their notes`
        }. Delete ${selectedKars.length} selected vessel${
          selectedKars.length === 1 ? "" : "s"
        }? This action cannot be undone.`
      : `Delete ${selectedKars.length} selected vessel${
          selectedKars.length === 1 ? "" : "s"
        }? This action cannot be undone.`;

  async function deleteSelectedKars() {
    try {
      const token = await getToken();
      const response = await fetch("/kar/delete-multiple", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({ ids: selectedKars }),
    });

      if (!response.ok) {
        throw new Error(`Vessel deletion failed (${response.status})`);
      }

      await supabaseBrowser.auth.refreshSession();
      await loadDashboardData();
      toggleSelectMode();
      return true;
    } catch (error) {
      console.error("Could not delete selected vessels", error);
      setFadeMessage("Could not delete the selected vessels. Please try again.");
      setTimeout(() => setFadeMessage(""), 3000);
      return false;
    }
  }

  async function createKar() {
    if (creatingKar || kar.length >= maxVessels) return;

    setCreatingKar(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/auth/login?redirect=/dashboard");
        return;
      }

      const res = await fetch("/kar/create", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (res.status === 401) {
        router.replace("/auth/login?redirect=/dashboard");
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
                nummer: current.length + 1,
                created_at: createdKar.created_at,
                status: "Ledig",
                batchName: null,
                isShared: false,
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

  async function leaveSharedVessel() {
    if (!sharedVesselToLeave || leavingSharedVessel) return false;
    setLeavingSharedVessel(true);
    try {
      const response = await fetch(
        `/api/kar/${sharedVesselToLeave.id}/contributors`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leave: true }),
        }
      );
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not leave the shared vessel.");
      }
      setSharedKar((current) =>
        current.filter((vessel) => vessel.id !== sharedVesselToLeave.id)
      );
      return true;
    } catch (error) {
      console.error("Could not leave shared vessel", error);
      setFadeMessage(
        error instanceof Error
          ? error.message
          : "Could not leave the shared vessel. Please try again."
      );
      setTimeout(() => setFadeMessage(""), 3000);
      return false;
    } finally {
      setLeavingSharedVessel(false);
    }
  }

  async function moveBatch(batchId: string, sourceVesselId: string, targetVesselId: string) {
    if (movingBatchId || sourceVesselId === targetVesselId) return;

    setMovingBatchId(batchId);
    setMoveNotice(null);
    try {
      const response = await fetch("/api/batches/move", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, sourceVesselId, targetVesselId }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not move the batch.");
      }

      setMoveNotice({
        message: `Batch moved from Vessel ${
          kar.find((vessel) => vessel.id === sourceVesselId)?.nummer ?? ""
        } to Vessel ${
          kar.find((vessel) => vessel.id === targetVesselId)?.nummer ?? ""
        }.`,
        isError: false,
      });
      setMoveSourceVesselId(null);
      await loadDashboardData();
    } catch (error) {
      console.error("Could not move batch to another vessel", error);
      setMoveNotice({
        message:
          error instanceof Error
            ? error.message
            : "Could not move the batch. Please try again.",
        isError: true,
      });
    } finally {
      setMovingBatchId(null);
    }
  }

  const activeVessels = [...kar, ...sharedKar].filter(
    (vessel) =>
      vessel.activeBatchId &&
      (vessel.status === "Aktiv" || vessel.status === "Sekundær" || vessel.status === "Conditioning")
  );

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
    <div className="bg-black/60 backdrop-blur-md p-6 pt-16 sm:p-8 sm:pt-16 rounded-xl border border-white/10 max-w-3xl mx-auto mt-20 sm:mt-24 relative">
      {fadeMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/80 text-white px-4 py-2 rounded-lg animate-fadeOut z-50">
          {fadeMessage}
        </div>
      )}

      {/* MENU */}
      <div className="absolute top-4 right-4 z-50">
        <MenuOverlay current="dashboard" />
      </div>

      <PageHeading
        title="Ferment-station"
        subtitle={`Logged in as ${username}`}
      />

      <p className="text-center text-zinc-300 mb-10 -mt-5 italic">
        {motd}
      </p>

      <nav aria-label="Brewing workflow shortcuts" className="mb-8 flex flex-wrap justify-center gap-3">
        <a
          href="/my-recipes"
          className="rounded-lg border border-green-500/50 bg-green-800/60 px-4 py-2 text-sm font-semibold hover:bg-green-700"
        >
          Plan a recipe
        </a>
        <a
          href="/batch-history"
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
        >
          Review batches
        </a>
        <a
          href="/brew-insights"
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
        >
          Learn from results
        </a>
      </nav>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-500/50 bg-red-700/30 p-4 text-center"
        >
          <p>{loadError}</p>
          <button
            onClick={() => loadDashboardData()}
            className="mt-3 rounded-lg border border-white/20 bg-white/10 px-4 py-2 hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      )}

      <h2 className="text-2xl font-semibold mb-2 text-center text-green-300">
        Your vessels
      </h2>
      <p className="mb-4 text-center text-sm text-white/55">
        Open a vessel to view its batch, or choose an empty vessel to start one.
      </p>

      {selectMode && moveSourceVesselId && (
        <p className="mb-4 rounded-lg border border-green-400/30 bg-green-950/30 px-4 py-3 text-center text-sm text-green-100">
          Choose an empty vessel to move “
          {kar.find((vessel) => vessel.id === moveSourceVesselId)?.batchName ||
            "active batch"}
          ” from Vessel{" "}
          {kar.find((vessel) => vessel.id === moveSourceVesselId)?.nummer}.
        </p>
      )}

      {selectMode && !moveSourceVesselId && (
        <p className="mb-4 rounded-lg border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-center text-sm text-amber-100/80">
          Select vessels to delete. Deleting a vessel with an active batch also
          permanently deletes that batch and its notes.
        </p>
      )}

      {moveNotice && (
        <p
          role={moveNotice.isError ? "alert" : "status"}
          className={`mb-4 rounded-lg border px-4 py-3 text-center text-sm ${
            moveNotice.isError
              ? "border-red-400/30 bg-red-950/40 text-red-200"
              : "border-green-400/30 bg-green-950/40 text-green-200"
          }`}
        >
          {moveNotice.message}
        </p>
      )}

      <div className="flex flex-wrap items-start justify-center gap-6">
        {kar.map((k) => (
          <div key={k.id} className="flex w-32 flex-col items-center gap-3">
          <motion.a
            layout="position"
            transition={{ layout: { duration: 0.22, ease: "easeOut" } }}
            href={selectMode ? "#" : `/kar/${k.id}`}
            onClick={(e) => {
              if (selectMode) {
                e.preventDefault();

                if (moveSourceVesselId) {
                  if (k.id !== moveSourceVesselId && k.status === "Ledig") {
                    setPendingMove({
                      sourceVesselId: moveSourceVesselId,
                      targetVesselId: k.id,
                    });
                    setMoveNotice(null);
                  } else if (k.id !== moveSourceVesselId) {
                    setMoveNotice({
                      message: "Choose an empty vessel as the destination.",
                      isError: true,
                    });
                  }
                  return;
                }

                toggleKarSelection(k.id);
              }
            }}
            style={k.isShared ? sharedVesselCardStyle : undefined}
            className={`relative border rounded-xl p-4 bg-white/5 w-32 h-32 flex flex-col items-center justify-center transition-colors overflow-hidden
              ${k.isShared ? "" : "border-white/10"}
              ${
                selectMode && selectedKars.includes(k.id)
                  ? "ring-4 ring-red-500"
                  : ""
              }
              ${
                selectMode && moveSourceVesselId === k.id
                  ? "ring-4 ring-green-800"
                  : ""
              }
              ${
                selectMode &&
                moveSourceVesselId &&
                k.id !== moveSourceVesselId &&
                k.status === "Ledig"
                  ? "ring-2 ring-green-400/60 cursor-pointer"
                  : ""
              }
              ${selectMode && !moveSourceVesselId ? "cursor-pointer" : ""}
              hover:bg-white/10
            `}
          >
            {k.isShared && (
              <span
                title="Shared with others"
                aria-label="Shared with others"
                style={sharedVesselIconStyle}
                className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border bg-black/80"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-3.5 w-3.5"
                >
                  <circle cx="6" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="14" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M2.5 15c.35-2.2 1.55-3.4 3.5-3.4s3.15 1.2 3.5 3.4M10.5 15c.35-2.2 1.55-3.4 3.5-3.4s3.15 1.2 3.5 3.4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            )}
            {/* ⭐ Only show bubbles when the vessel has an active batch */}
{(k.status === "Aktiv" || k.status === "Sekundær" || k.status === "Conditioning") && (
  <FermentationBubbles />
)}


            <div
              className="text-lg font-bold text-green-300 text-center leading-tight line-clamp-2"
            >
              {k.batchName || `Vessel ${k.nummer}`}
            </div>


            <span
              className="relative z-10 mt-2 text-center text-xs font-semibold leading-tight text-zinc-400"
            >
              {vesselStageLabel(k.status)}
            </span>
          </motion.a>
          {selectMode &&
            k.activeBatchId &&
            (k.status === "Aktiv" || k.status === "Sekundær" || k.status === "Conditioning") && (
              <div className="w-full origin-top animate-growIn">
                <button
                  type="button"
                  aria-pressed={moveSourceVesselId === k.id}
                  onClick={() => {
                    setMoveSourceVesselId((current) =>
                      current === k.id ? null : k.id
                    );
                    setPendingMove(null);
                    setSelectedKars([]);
                    setMoveNotice(null);
                  }}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10"
                >
                  {moveSourceVesselId === k.id ? "Cancel move" : "Move batch"}
                </button>
              </div>
            )}
          </div>
        ))}

        {(selectMode || kar.length < maxVessels) && (
          <motion.button
            layout
            transition={{ layout: { duration: 0.22, ease: "easeOut" } }}
            onClick={() => {
              if (selectMode) toggleSelectMode();
              void createKar();
            }}
            disabled={creatingKar || kar.length >= maxVessels}
            aria-label={creatingKar ? "Creating vessel" : "Create vessel"}
            title={
              kar.length >= maxVessels
                ? `Vessel limit reached (${maxVessels})`
                : "Create vessel"
            }
            className="border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60 disabled:cursor-wait rounded-xl p-4 w-32 h-32 flex items-center justify-center text-white text-3xl font-bold"
          >
            {creatingKar ? "…" : "+"}
          </motion.button>
        )}
      </div>

      <p className="text-center mt-5 opacity-60">
        Vessel limit: {maxVessels}
      </p>

      <div className="flex justify-center mt-6 mb-6">
        {!selectMode && (
          <button
            onClick={toggleSelectMode}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            Select vessels
          </button>
        )}

        {selectMode && (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setConfirmDeleteVessels(true)}
              type="button"
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

      {sharedKar.length > 0 && (
        <section className="mt-10 border-t border-white/10 pt-8">
          <h2 className="mb-4 text-center text-2xl font-semibold text-green-300">
            Vessels shared with me
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            {sharedKar.map((vessel) => (
              <div key={vessel.id} className="flex w-36 flex-col items-center gap-2">
                <a
                  href={`/kar/${vessel.id}`}
                  style={sharedVesselCardStyle}
                  className="relative flex h-36 w-36 flex-col items-center justify-center overflow-hidden rounded-xl border bg-white/5 p-3 text-center transition hover:bg-white/10"
                >
                <span
                  title="Shared with you"
                  aria-label="Shared with you"
                  style={sharedVesselIconStyle}
                  className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border bg-black/80"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-3.5 w-3.5"
                  >
                    <circle cx="6" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="14" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M2.5 15c.35-2.2 1.55-3.4 3.5-3.4s3.15 1.2 3.5 3.4M10.5 15c.35-2.2 1.55-3.4 3.5-3.4s3.15 1.2 3.5 3.4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                {(vessel.status === "Aktiv" || vessel.status === "Sekundær" || vessel.status === "Conditioning") && (
                  <FermentationBubbles />
                )}
                <span className="relative z-10 line-clamp-2 text-base font-bold leading-tight text-green-300">
                  {sharedVesselName(vessel)}
                </span>
                <span className="relative z-10 mt-2 text-xs text-zinc-300">
                  {vesselStageLabel(vessel.status)}
                </span>
                <span className="relative z-10 mt-1 line-clamp-1 text-xs text-zinc-400">
                  Shared by {vessel.ownerUsername}
                </span>
                </a>
                <button
                  type="button"
                  onClick={() => setSharedVesselToLeave(vessel)}
                  className="text-xs text-zinc-400 underline underline-offset-2 transition hover:text-red-300"
                >
                  Leave shared vessel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmDeleteVessels}
        title={
          selectedActiveBatches.length > 0
            ? "Delete vessels and active batches?"
            : "Delete selected vessels?"
        }
        message={deleteConfirmationMessage}
        confirmLabel={
          selectedActiveBatches.length > 0
            ? "Delete vessels and batches"
            : "Delete vessels"
        }
        onConfirm={deleteSelectedKars}
        onCancel={() => setConfirmDeleteVessels(false)}
      />
      <ConfirmDialog
        open={sharedVesselToLeave !== null}
        title="Leave shared vessel?"
        message={
          sharedVesselToLeave
            ? `You will lose access to ${sharedVesselName(sharedVesselToLeave)} shared by ${sharedVesselToLeave.ownerUsername}. The owner can share it with you again later.`
            : ""
        }
        confirmLabel={leavingSharedVessel ? "Leaving…" : "Leave vessel"}
        onConfirm={leaveSharedVessel}
        onCancel={() => setSharedVesselToLeave(null)}
      />
      <ConfirmDialog
        open={pendingMove !== null}
        title="Move batch to this vessel?"
        message={
          pendingMove
            ? `Move “${
                kar.find(
                  (vessel) => vessel.id === pendingMove.sourceVesselId
                )?.batchName || "active batch"
              }” from Vessel ${
                kar.find(
                  (vessel) => vessel.id === pendingMove.sourceVesselId
                )?.nummer
              } to Vessel ${
                kar.find(
                  (vessel) => vessel.id === pendingMove.targetVesselId
                )?.nummer
              }? Vessel numbers stay fixed.`
            : ""
        }
        confirmLabel="Move batch"
        onConfirm={async () => {
          if (!pendingMove) return false;
          const source = kar.find(
            (vessel) => vessel.id === pendingMove.sourceVesselId
          );
          if (!source?.activeBatchId) {
            setMoveNotice({
              message: "The source batch is no longer active. Refresh and try again.",
              isError: true,
            });
            return true;
          }
          await moveBatch(
            source.activeBatchId,
            pendingMove.sourceVesselId,
            pendingMove.targetVesselId
          );
          return true;
        }}
        onCancel={() => setPendingMove(null)}
      />

      <DashboardGuide vessels={activeVessels} />

      <style jsx>{`
        @keyframes growIn {
          from {
            opacity: 0;
            transform: scaleY(0);
          }
          to {
            opacity: 1;
            transform: scaleY(1);
          }
        }

        .animate-growIn {
          animation: growIn 220ms ease-out both;
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

      `}</style>
    </div>
  );
}
