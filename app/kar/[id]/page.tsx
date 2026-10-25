"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import dynamic from "next/dynamic";
import * as Actions from "./actions";
import { KarNotesClient } from "./KarNotesClient";
import VesselContributors from "./VesselContributors";
import MenuOverlay from "@/app/components/MenuOverlay";
import VisibilitySwitch from "@/app/components/VisibilitySwitch";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import PageHeading from "@/app/components/PageHeading";
import BatchReminders from "./BatchReminders";
import BatchRecipeCard from "./BatchRecipeCard";
import ActiveBatchOverview from "./ActiveBatchOverview";
import BrewDayChecklist from "./BrewDayChecklist";
import QRCode from "qrcode";


import { translateOldRecipe } from "@/lib/translateOldRecipe";
import { UnitInput, UnitSymbol } from "@/app/components/Units";
import BatchEditTypeFields from "./BatchEditTypeFields";
import { formatSecondaryAdditions } from "@/lib/recipes/secondaryAdditions";
import RecipeSecondaryFields from "@/app/my-recipes/new/RecipeSecondaryFields";
import VesselActivity from "./VesselActivity";
import ExpandArrowButton from "@/app/components/ExpandArrowButton";
import SplitBatchPanel from "./SplitBatchPanel";
import ConditioningLog from "./ConditioningLog";
import PublicMentionTextarea from "@/app/components/PublicMentionTextarea";

const BatchSGChart = dynamic(
  () => import("@/app/components/BatchSGChart"),
  { ssr: false, loading: () => <p className="text-sm text-white/60">Loading chart…</p> }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function localDateValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export default function KarPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inventoryError = searchParams.get("inventory_error");
  const batchRefreshKey =
    searchParams.get("cancelled") ??
    searchParams.get("racked") ??
    searchParams.get("guide");
  const [openSecondary, setOpenSecondary] = useState(false);
  const [openConditioningActive, setOpenConditioningActive] = useState(false);
  const [openFinish, setOpenFinish] = useState(false);
  const [openSharing, setOpenSharing] = useState(false);
  const [openSharedNotes, setOpenSharedNotes] = useState(false);
  const [confirmCancelBatch, setConfirmCancelBatch] = useState(false);
  const cancelBatchFormRef = useRef<HTMLFormElement>(null);
  const cancelBatchConfirmedRef = useRef(false);

  const [user, setUser] = useState<any>(null);
  const [kar, setKar] = useState<any>(null);
  const [isContributor, setIsContributor] = useState(false);
  const [hasSharedContributors, setHasSharedContributors] = useState(false);
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [historyBatch, setHistoryBatch] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEdit, setOpenEdit] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [editBatchError, setEditBatchError] = useState("");
  const [sgReadings, setSgReadings] = useState<any[]>([]);
  const [canViewSGGraph, setCanViewSGGraph] = useState(false);
  const [openSG, setOpenSG] = useState(false);
  const [sgValue, setSgValue] = useState("");
  const [sgError, setSgError] = useState("");
  const [savingSG, setSavingSG] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrPng, setQrPng] = useState<string | null>(null);
  const [karLoading, setKarLoading] = useState(true);
  const [lifecycleSchemaStatus, setLifecycleSchemaStatus] = useState<
    "checking" | "ready" | "unavailable"
  >("checking");
  const [conditioningSchemaStatus, setConditioningSchemaStatus] = useState<
    "checking" | "ready" | "unavailable"
  >("checking");
  const [lifecycleSchemaMessage, setLifecycleSchemaMessage] = useState("");

  const [openStyleSelect, setOpenStyleSelect] = useState(false);
  const [freeVessels, setFreeVessels] = useState<any[]>([]);
  const [vesselNumber, setVesselNumber] = useState<number | null>(null);
  const latestSG = sgReadings.length > 0
    ? Number(sgReadings[sgReadings.length - 1].sg)
    : null;

  useEffect(() => {
    if (!activeBatch?.id) return;

    let active = true;
    setLifecycleSchemaStatus("checking");
    setLifecycleSchemaMessage("");
    void (async () => {
      try {
        const { error } = await supabase
          .from("batches")
          .select(
            "packaged_volume_l, packaging_method, bottle_volume_l, keg_volume_l, package_count, carbonation_method, target_carbonation_volumes, priming_sugar_g, tasting_notes, packaged_at, share_outcome_publicly, share_tasting_notes_publicly, recipe_id, recipe_snapshot"
          )
          .eq("id", activeBatch.id)
          .maybeSingle();
        if (!active) return;
        if (error) {
          console.error("Could not verify batch lifecycle database fields", error);
          setLifecycleSchemaStatus("unavailable");
          setLifecycleSchemaMessage(
            ["42703", "PGRST204"].includes(error.code ?? "")
              ? "Finish & Bottle is unavailable until the batch lifecycle database migration is applied."
              : "Could not verify Finish & Bottle storage. Please try again later."
          );
          return;
        }
        setLifecycleSchemaStatus("ready");
      } catch (error) {
        console.error("Could not verify batch lifecycle database fields", error);
        if (!active) return;
        setLifecycleSchemaStatus("unavailable");
        setLifecycleSchemaMessage(
          "Could not verify Finish & Bottle storage. Please try again later."
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [activeBatch?.id]);

  useEffect(() => {
    if (!activeBatch?.id) return;
    let active = true;
    setConditioningSchemaStatus("checking");
    void (async () => {
      try {
        const { error } = await supabase
          .from("batches")
          .select("conditioning_startdate, conditioning_notes")
          .eq("id", activeBatch.id)
          .maybeSingle();
        if (!active) return;
        if (error) {
          console.error("Could not verify conditioning database fields", error);
          setConditioningSchemaStatus("unavailable");
          return;
        }
        const { error: entriesError } = await supabase
          .from("batch_conditioning_entries")
          .select("id")
          .limit(1);
        if (!active) return;
        if (entriesError) {
          console.error("Could not verify conditioning activity storage", entriesError);
          setConditioningSchemaStatus("unavailable");
          return;
        }
        setConditioningSchemaStatus("ready");
      } catch (error) {
        console.error("Could not verify conditioning database storage", error);
        if (active) setConditioningSchemaStatus("unavailable");
      }
    })();
    return () => { active = false; };
  }, [activeBatch?.id]);

  const currentAbv =
    activeBatch?.og && latestSG
      ? ((Number(activeBatch.og) - latestSG) * 131.25).toFixed(2)
      : null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
  if (!user) return;

  supabase
    .from("kar")
    .select("*")
    .eq("id", params.id)
    .single()
    .then(({ data }) => {
      setKar(data);
      setKarLoading(false);
    });
}, [user, params.id]);

  useEffect(() => {
    if (!kar || !user || kar.user_id === user.id) {
      setIsContributor(false);
      return;
    }

    supabase
      .from("kar_contributors")
      .select("kar_id")
      .eq("kar_id", kar.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Could not verify shared vessel access", error);
          setIsContributor(false);
          return;
        }
        setIsContributor(!!data);
      });
  }, [kar, user]);

  useEffect(() => {
    if (!kar || !user || kar.user_id !== user.id) {
      setHasSharedContributors(false);
      return;
    }

    let active = true;
    fetch(`/api/kar/${encodeURIComponent(kar.id)}/contributors`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const result: { contributors?: unknown[]; error?: string } = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load vessel contributors");
        }
        if (active) setHasSharedContributors((result.contributors?.length ?? 0) > 0);
      })
      .catch((error) => {
        console.error("Could not check whether vessel is shared", error);
        if (active) setHasSharedContributors(false);
      });

    return () => {
      active = false;
    };
  }, [kar, user]);

  useEffect(() => {
    if (!kar) return;
    let active = true;
    setActiveBatch(null);
    supabase
      .from("batches")
      .select("*")
      .eq("aktivt_kar", kar.id)
      .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"])
      .order("created_at", { ascending: false })
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Could not load active batch", error);
          return;
        }
        if (active) setActiveBatch(data);
      });
    return () => {
      active = false;
    };
  }, [kar, batchRefreshKey]);



  useEffect(() => {
    if (!kar) return;
    if (kar.user_id !== user?.id) {
      setVesselNumber(null);
      setFreeVessels([]);
      return;
    }
    (async () => {
      const [{ data: vessels }, { data: busy }] = await Promise.all([
        supabase
          .from("kar")
          .select("id")
          .eq("user_id", kar.user_id)
          .order("created_at", { ascending: true }),
        supabase
          .from("batches")
          .select("aktivt_kar")
          .eq("user_id", kar.user_id)
          .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"]),
      ]);
      const numbered = (vessels ?? []).map((v: any, i: number) => ({
        id: v.id,
        nummer: i + 1,
      }));
      const busyIds = new Set((busy ?? []).map((b: any) => b.aktivt_kar));
      setVesselNumber(numbered.find((v) => v.id === kar.id)?.nummer ?? null);
      setFreeVessels(
        activeBatch
          ? numbered.filter((v) => v.id !== kar.id && !busyIds.has(v.id))
          : []
      );
    })();
  }, [kar, activeBatch, user]);

  useEffect(() => {
    if (!kar || activeBatch) return;
    supabase
      .from("batches")
      .select("*")
      .eq("aktivt_kar", kar.id)
      .order("finished_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setHistoryBatch(data));
  }, [kar, activeBatch]);

  useEffect(() => {
    if (!activeBatch) return;
    supabase
      .from("batch_notes")
      .select("*")
      .eq("batch_id", activeBatch.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setNotes(data ?? []));
  }, [activeBatch]);

  useEffect(() => {
  if (!activeBatch) return;
    let active = true;
    fetch(`/api/sg?batchId=${encodeURIComponent(activeBatch.id)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const result: { readings?: any[]; canViewGraph?: boolean; error?: string } =
          await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load SG readings");
        if (active) {
          setCanViewSGGraph(result.canViewGraph === true);
          setSgReadings(result.readings ?? []);
        }
      })
      .catch((error) => {
        console.error("Could not load specific gravity readings", error);
        if (active) setSgError("SG readings could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [activeBatch]);

  useEffect(() => {
    if (!activeBatch) return;
    function openGravityFromGuide() {
      if (window.location.hash !== "#sg-log") return;
      setOpenSG(true);
      document.getElementById("sg-log")?.scrollIntoView({ block: "start" });
    }
    openGravityFromGuide();
    window.addEventListener("hashchange", openGravityFromGuide);
    return () => window.removeEventListener("hashchange", openGravityFromGuide);
  }, [activeBatch]);


  if (loading) {
  return (
    <main className="min-h-screen flex items-center justify-center text-white">
      <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
        Loading…
      </div>
    </main>
  );
}

  if (!user) {
  if (typeof window !== "undefined") {
    router.replace(`/auth/login?redirect=/kar/${params.id}`);
  }
  return null;
  }

  if (karLoading) {
  return (
    <main className="min-h-screen flex items-center justify-center text-white">
      <h1 className="text-2xl font-bold">Loading...</h1>
    </main>
  );
}

  if (!kar && !karLoading) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-10 rounded-2xl border border-white/10 text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2">No access</h1>
        <p className="opacity-80 mb-6">
          You do not have access to this vessel.
        </p>

        <button
  onClick={() => router.push("/dashboard")}
  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition"
>
  Go back
</button>

      </div>
    </main>
  );
}

  const isOwner = kar.user_id === user.id;
  const canContribute = isOwner || isContributor;
  const hasActive = !!activeBatch;

  const hasHistory = !!historyBatch;
  const splitVessels = [
    { id: kar.id, nummer: vesselNumber, isCurrent: true },
    ...freeVessels.map((vessel) => ({
      id: vessel.id,
      nummer: vessel.nummer,
      isCurrent: false,
    })),
  ];

  async function saveBatchChanges(formData: FormData) {
    setSavingBatch(true);
    setEditBatchError("");
    try {
      await Actions.updateBatch(formData);
      setOpenEdit(false);
      window.location.reload();
    } catch (error) {
      console.error("Could not save batch changes", error);
      setEditBatchError(
        error instanceof Error ? error.message : "Could not save batch changes."
      );
      setSavingBatch(false);
    }
  }

async function saveSG() {
  const value = Number(sgValue);
  if (!Number.isFinite(value) || value <= 0 || !activeBatch) {
    setSgError("Enter a valid specific gravity reading.");
    return;
  }

  setSavingSG(true);
  setSgError("");
  try {
    const response = await fetch("/api/sg", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: activeBatch.id, sg: value }),
    });
    const result: { error?: string } = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save SG reading");

    const readingsResponse = await fetch(
      `/api/sg?batchId=${encodeURIComponent(activeBatch.id)}`,
      { credentials: "include", cache: "no-store" }
    );
    const readingsResult: {
      readings?: any[];
      canViewGraph?: boolean;
      error?: string;
    } =
      await readingsResponse.json();
    if (!readingsResponse.ok) {
      throw new Error(readingsResult.error || "Could not load SG readings");
    }

    setSgValue("");
    setCanViewSGGraph(readingsResult.canViewGraph === true);
    setSgReadings(readingsResult.readings ?? []);
  } catch (error) {
    console.error("Could not save specific gravity reading", error);
    setSgError("Could not save this reading. Please try again.");
  } finally {
    setSavingSG(false);
  }
}


  // ⭐ NEW: Toggle visibility for this vessel
async function toggleVisibility() {
  const newValue = !kar.is_public;

  const form = new FormData();
  form.append("id", kar.id);
  form.append("is_public", String(newValue));

  await fetch("/api/kar/visibility", {
    method: "POST",
    body: form,
  });

  setKar((prev: any) => ({ ...prev, is_public: newValue }));
}

const sharingSection = isOwner ? (
  <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
    <div className="flex w-full items-center justify-between gap-3 font-semibold text-green-300">
      <span className="text-lg">Share vessel with friends</span>
      <ExpandArrowButton
        expanded={openSharing}
        label="vessel sharing"
        controls="vessel-sharing-content"
        onClick={() => setOpenSharing((open) => !open)}
      />
    </div>
    {openSharing && (
      <div id="vessel-sharing-content" className="mt-4">
        <VesselContributors
          karId={kar.id}
          onSharingChange={setHasSharedContributors}
        />
      </div>
    )}
  </div>
) : null;


  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19l-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </button>

          <MenuOverlay current="kar" />
        </div>
      

{isOwner && (
  <button
    onClick={async () => {
      setShowQR(true);

      const url = `https://batchlogg.vercel.app/kar/${kar.id}`;

      // Generer ren QR som PNG
      const png = await QRCode.toDataURL(url, {
        width: 600,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff"
        }
      });

      setQrPng(png);
    }}
    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold mb-10 mx-auto block"
  >
    Generate QR code
  </button>
)}

{sharingSection}

{showQR && (
  <div
    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-10 z-50"
    onClick={() => setShowQR(false)}
  >
    <div
      className="bg-black/60 p-6 rounded-xl border border-white/10 text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-xl font-semibold mb-4">QR code for this vessel</h2>

      <div className="mx-auto" style={{ width: "80vw", maxWidth: "600px" }}>
        <div style={{ position: "relative", width: "100%", paddingBottom: "100%" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            {qrPng && (
              <img
                src={qrPng}
                alt="QR code"
                className="p-4 bg-black/40 rounded-xl border border-white/10 w-full h-full object-contain"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 mt-6">

        {/* PC only */}
        <button
          onClick={() => {
            if (!qrPng) return;

            const link = document.createElement("a");
            link.href = qrPng;
            link.download = `kar-${kar.id}-qr.png`;
            link.click();
          }}
          className="hidden md:block px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold w-40 text-center"
        >
          Download PNG
        </button>

        <button
          onClick={() => setShowQR(false)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold w-40 text-center"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

        {/* ⭐ VESSEL VISIBILITY SLIDER */}
{isOwner && (
  <div className="flex items-center justify-center gap-4 mb-10">
    <VisibilitySwitch
      label="Vessel Visibility"
      checked={kar.is_public}
      onChange={toggleVisibility}
      ariaLabel="Vessel visibility"
    />
  </div>
)}

<PageHeading
  title={vesselNumber ? `Vessel ${vesselNumber}` : isOwner ? "Vessel" : "Shared vessel"}
  subtitle={
    activeBatch
      ? activeBatch.status === "Conditioning"
        ? "Conditioning"
        : ["Sekundær", "secondary"].includes(activeBatch.status)
          ? "Secondary fermentation"
          : "Primary fermentation"
      : "View vessel details and start a new batch."
  }
/>

{inventoryError && (
  <p role="alert" className="mb-6 rounded-lg border border-amber-400/40 bg-amber-950/40 p-3 text-center text-amber-200">
    {inventoryError}
  </p>
)}

        {/* EMPTY VESSEL */}
        {!activeBatch && (
  <>
    <p className="text-center opacity-70 mb-6">
      This vessel is currently empty.
    </p>

    {canContribute && (
      <div className="text-center mb-10">
        <button
  onClick={() => setOpenStyleSelect(true)}
  className="px-6 py-3 bg-green-700 hover:bg-green-800 rounded-lg font-semibold"
>
  Register batch
</button>
      </div>
    )}
  </>
)}

{openStyleSelect && (
  <div
    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
    onClick={() => setOpenStyleSelect(false)}
  >
    <div
      className="bg-black/60 p-6 rounded-xl border border-white/10 w-full max-w-md"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-2xl font-bold text-center mb-6">Choose batch type</h2>

      <div className="flex flex-col gap-4">
        <Link
          href={`/my-recipes?vessel=${encodeURIComponent(kar.id)}`}
          className="rounded-lg border border-green-500/60 bg-green-700/30 px-4 py-3 text-center font-semibold text-green-100 hover:bg-green-700/50"
        >
          Start from a saved recipe
        </Link>
        {["Mead", "Beer", "Cider", "Wine", "Hard Seltzer", "Braggot", "Other"].map((type) => (
          <button
            key={type}
            onClick={() => {
              router.push(`/kar/${kar.id}/new/${type.toLowerCase()}`);
            }}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            {type}
          </button>
        ))}
      </div>

      <button
        onClick={() => setOpenStyleSelect(false)}
        className="mt-8 w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
      >
        Cancel
      </button>
    </div>
  </div>
)}


{/* SECONDARY FERMENTATION */}
{hasActive && ["Sekundær", "secondary"].includes(activeBatch?.status) && (
  <>
    <h2 className="text-2xl font-semibold mb-4 text-center text-green-300">
      Secondary fermentation
    </h2>

    <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-green-300">
          {activeBatch.name}
        </h3>

        {canContribute && (
          <button
            type="button"
            onClick={() => setOpenEdit(!openEdit)}
            className="font-semibold text-green-300 cursor-pointer"
          >
            Edit batch
          </button>
        )}
      </div>

      {/* Edit form */}
      {openEdit && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-4">
          <form action={saveBatchChanges} className="flex flex-col gap-4">
            <input type="hidden" name="batch_id" value={activeBatch.id} />
            <input type="hidden" name="kar_id" value={kar.id} />

            {/* Common fields */}
            <label className="font-semibold">
              {activeBatch.type === "Beer" &&
              activeBatch.beer_subtype !== "all_grain"
                ? "Batch / kit name"
                : "Batch name"}
            </label>
            <input name="name" defaultValue={activeBatch.name}
              required
              className="p-3 rounded bg-black/40 border border-white/20" />

            {activeBatch.type === "Other" && (
              <div>
                <label htmlFor="edit-other-style" className="font-semibold">
                  Style or type (optional)
                </label>
                <input
                  id="edit-other-style"
                  name="other_style"
                  defaultValue={activeBatch.other_style ?? ""}
                  maxLength={80}
                  placeholder="Example: Kombucha"
                  className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3"
                />
              </div>
            )}

            <label className="font-semibold">
              Volume (<UnitSymbol kind="volume" />)
            </label>
            <UnitInput
              kind="volume"
              name="volume_l"
              defaultValue={String(activeBatch.volume_l ?? "")}
              required
              className="p-3 rounded bg-black/40 border border-white/20"
            />

            <label className="font-semibold">Start date</label>
            <input name="startdato" type="date"
              defaultValue={activeBatch.startdato.split("T")[0]}
              required
              className="p-3 rounded bg-black/40 border border-white/20" />

            <label className="font-semibold">Original Gravity (OG)</label>
            <input name="og" type="number" step="0.001"
              defaultValue={activeBatch.og}
              required
              className="p-3 rounded bg-black/40 border border-white/20" />

            <BatchEditTypeFields batch={activeBatch} />

            <RecipeSecondaryFields
              defaultValue={activeBatch.secondary_additions}
              defaultNotes={activeBatch.secondary_notes}
              defaultEnabled
              showToggle={false}
              includeHadSecondaryField={false}
            />

            {editBatchError && (
              <p role="alert" className="text-sm text-amber-300">{editBatchError}</p>
            )}
            <button disabled={savingBatch} className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold disabled:opacity-50">
              {savingBatch ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      )}

      

      <ActiveBatchOverview batch={activeBatch} />
      <div id="batch-recipe" className="scroll-mt-6">
        <BatchRecipeCard batch={activeBatch} />
      </div>
      <section className="mb-5 mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <h3 className="mb-3 text-lg font-semibold text-green-300">Secondary fermentation</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-white/50">Racked on</p>
            <p className="mt-1 font-medium text-white">
              {new Date(activeBatch.secondary_startdate).toLocaleDateString("en-US")}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-white/50">Additions</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">
              {activeBatch.secondary_additions
                ? formatSecondaryAdditions(activeBatch.secondary_additions)
                : "No secondary additions recorded."}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-white/50">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">
              {activeBatch.secondary_notes?.trim() || "No secondary notes recorded."}
            </p>
          </div>
        </div>
      </section>
      <BrewDayChecklist
        batchId={String(activeBatch.id)}
        batchType={activeBatch.type}
        beerSubtype={activeBatch.beer_subtype}
        batchName={activeBatch.name}
        boilMinutes={activeBatch.boil_time}
        isSecondary
      />
      {activeBatch.recipe_id && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href={`/my-recipes/${encodeURIComponent(activeBatch.recipe_id)}`}
            className="text-sm font-semibold text-amber-200 underline underline-offset-4"
          >
            View source recipe
          </Link>
          <Link
            href={`/my-recipes?start=${encodeURIComponent(activeBatch.recipe_id)}`}
            className="text-sm font-semibold text-amber-200 underline underline-offset-4"
          >
            Brew this recipe again
          </Link>
        </div>
      )}
      <p className="mt-4 text-sm text-white/50">
        Created: {new Date(activeBatch.created_at).toLocaleDateString("en-US")}
      </p>
    </div>
  </>
)}

{/* CONDITIONING */}
{hasActive && activeBatch?.status === "Conditioning" && (
  <>
    <h2 className="mb-4 text-center text-2xl font-semibold text-green-300">
      Conditioning
    </h2>
    <div className="mb-10 rounded-xl border border-white/20 bg-white/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xl font-bold text-green-300">{activeBatch.name}</h3>
        {canContribute && (
          <button
            type="button"
            onClick={() => setOpenEdit(!openEdit)}
            className="cursor-pointer font-semibold text-green-300"
          >
            Edit batch
          </button>
        )}
      </div>
      {openEdit && (
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <form action={saveBatchChanges} className="flex flex-col gap-4">
            <input type="hidden" name="batch_id" value={activeBatch.id} />
            <input type="hidden" name="kar_id" value={kar.id} />
            <label className="font-semibold">
              {activeBatch.type === "Beer" &&
              activeBatch.beer_subtype !== "all_grain"
                ? "Batch / kit name"
                : "Batch name"}
            </label>
            <input name="name" defaultValue={activeBatch.name} required className="rounded border border-white/20 bg-black/40 p-3" />
            {activeBatch.type === "Other" && (
              <div>
                <label htmlFor="edit-other-style" className="font-semibold">
                  Style or type (optional)
                </label>
                <input
                  id="edit-other-style"
                  name="other_style"
                  defaultValue={activeBatch.other_style ?? ""}
                  maxLength={80}
                  placeholder="Example: Kombucha"
                  className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3"
                />
              </div>
            )}
            <label className="font-semibold">
              Volume (<UnitSymbol kind="volume" />)
            </label>
            <UnitInput kind="volume" name="volume_l" defaultValue={String(activeBatch.volume_l ?? "")} required className="rounded border border-white/20 bg-black/40 p-3" />
            <label className="font-semibold">Start date</label>
            <input name="startdato" type="date" defaultValue={activeBatch.startdato.split("T")[0]} required className="rounded border border-white/20 bg-black/40 p-3" />
            <label className="font-semibold">Original Gravity (OG)</label>
            <input name="og" type="number" step="0.001" defaultValue={activeBatch.og} required className="rounded border border-white/20 bg-black/40 p-3" />
            <BatchEditTypeFields batch={activeBatch} />
            <RecipeSecondaryFields defaultValue={activeBatch.secondary_additions} defaultNotes={activeBatch.secondary_notes} defaultEnabled showToggle={false} includeHadSecondaryField={false} />
            {editBatchError && <p role="alert" className="text-sm text-amber-300">{editBatchError}</p>}
            <button disabled={savingBatch} className="rounded-lg border border-green-500 bg-green-700 px-4 py-3 font-semibold hover:bg-green-600 disabled:opacity-50">
              {savingBatch ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      )}
      <ActiveBatchOverview batch={activeBatch} secondary />
      <div id="batch-recipe" className="scroll-mt-6">
        <BatchRecipeCard batch={activeBatch} />
      </div>
      <section className="mb-5 mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <h3 className="mb-3 text-lg font-semibold text-green-300">Conditioning started</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-white/50">Racked on</p>
            <p className="mt-1 font-medium text-white">
              {activeBatch.conditioning_startdate
                ? new Date(activeBatch.conditioning_startdate).toLocaleDateString("en-US")
                : "Date not recorded"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-white/50">Initial notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">
              {activeBatch.conditioning_notes?.trim() || "No conditioning notes recorded."}
            </p>
          </div>
        </div>
      </section>
      {conditioningSchemaStatus === "ready" ? (
        <ConditioningLog
          batchId={String(activeBatch.id)}
          karId={String(kar.id)}
          canContribute={canContribute}
        />
      ) : (
        <p role={conditioningSchemaStatus === "unavailable" ? "alert" : undefined} className="mb-5 text-sm text-amber-200">
          {conditioningSchemaStatus === "checking"
            ? "Checking conditioning activity storage…"
            : "Conditioning activity is unavailable until the conditioning database migration is applied."}
        </p>
      )}
      {activeBatch.recipe_id && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          <Link href={`/my-recipes/${encodeURIComponent(activeBatch.recipe_id)}`} className="text-sm font-semibold text-amber-200 underline underline-offset-4">
            View source recipe
          </Link>
          <Link href={`/my-recipes?start=${encodeURIComponent(activeBatch.recipe_id)}`} className="text-sm font-semibold text-amber-200 underline underline-offset-4">
            Brew this recipe again
          </Link>
        </div>
      )}
    </div>
  </>
)}


{/* PRIMARY FERMENTATION */}
{hasActive && activeBatch?.status === "Aktiv" && (
  <>
    <h2 className="text-2xl font-semibold mb-4 text-center">
      Primary fermentation
    </h2>

    <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-green-300">
          {activeBatch.name}
        </h3>

        {canContribute && (
          <button
            type="button"
            onClick={() => setOpenEdit(!openEdit)}
            className="font-semibold text-green-300 cursor-pointer"
          >
            Edit batch
          </button>
        )}
      </div>


      {/* Edit form */}
      {openEdit && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-4">
          <form action={saveBatchChanges} className="flex flex-col gap-4">
            <input type="hidden" name="batch_id" value={activeBatch.id} />
            <input type="hidden" name="kar_id" value={kar.id} />
      
            {/* COMMON FIELDS */}
            <label className="font-semibold">
              {activeBatch.type === "Beer" &&
              activeBatch.beer_subtype !== "all_grain"
                ? "Batch / kit name"
                : "Batch name"}
            </label>
            <input
              name="name"
              defaultValue={activeBatch.name}
              required
              className="p-3 rounded bg-black/40 border border-white/20"
            />

            {activeBatch.type === "Other" && (
              <div>
                <label htmlFor="edit-other-style" className="font-semibold">
                  Style or type (optional)
                </label>
                <input
                  id="edit-other-style"
                  name="other_style"
                  defaultValue={activeBatch.other_style ?? ""}
                  maxLength={80}
                  placeholder="Example: Kombucha"
                  className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3"
                />
              </div>
            )}
      
            <label className="font-semibold">
              Volume (<UnitSymbol kind="volume" />)
            </label>
            <UnitInput
              kind="volume"
              name="volume_l"
              defaultValue={String(activeBatch.volume_l ?? "")}
              required
              className="p-3 rounded bg-black/40 border border-white/20"
            />
      
            <label className="font-semibold">Start date</label>
            <input
              name="startdato"
              type="date"
              defaultValue={activeBatch.startdato.split("T")[0]}
              required
              className="p-3 rounded bg-black/40 border border-white/20"
            />
      
            <label className="font-semibold">Original Gravity (OG)</label>
            <input
              name="og"
              type="number"
              step="0.001"
              defaultValue={activeBatch.og}
              required
              className="p-3 rounded bg-black/40 border border-white/20"
            />

            <BatchEditTypeFields batch={activeBatch} />

            {editBatchError && (
              <p role="alert" className="text-sm text-amber-300">{editBatchError}</p>
            )}
            <button disabled={savingBatch} className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold disabled:opacity-50">
              {savingBatch ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      )}
      
      <ActiveBatchOverview batch={activeBatch} />
      <div id="batch-recipe" className="scroll-mt-6">
        <BatchRecipeCard batch={activeBatch} />
      </div>
      <BrewDayChecklist
        batchId={String(activeBatch.id)}
        batchType={activeBatch.type}
        beerSubtype={activeBatch.beer_subtype}
        batchName={activeBatch.name}
        boilMinutes={activeBatch.boil_time}
      />
      {activeBatch.recipe_id && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href={`/my-recipes/${encodeURIComponent(activeBatch.recipe_id)}`}
            className="text-sm font-semibold text-amber-200 underline underline-offset-4"
          >
            View source recipe
          </Link>
          <Link
            href={`/my-recipes?start=${encodeURIComponent(activeBatch.recipe_id)}`}
            className="text-sm font-semibold text-amber-200 underline underline-offset-4"
          >
            Brew this recipe again
          </Link>
        </div>
      )}
      <p className="mt-4 text-sm text-white/50">
        Created: {new Date(activeBatch.created_at).toLocaleDateString("en-US")}
      </p>
    </div>
    </>
  )}



    {/* Rack to secondary */}
{hasActive && canContribute && activeBatch.status === "Aktiv" && (
  <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
    <div className="flex w-full items-center justify-between gap-3 font-semibold text-green-300">
      <span className="text-lg">Rack to secondary</span>
      <ExpandArrowButton
        expanded={openSecondary}
        label="rack to secondary"
        controls="rack-to-secondary-content"
        onClick={() => setOpenSecondary((open) => !open)}
      />
    </div>
    <div
      id="rack-to-secondary-content"
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        openSecondary ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <form action={Actions.moveToSecondary} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="batch_id" value={activeBatch.id} />
          <input type="hidden" name="kar_id" value={kar.id} />
          <RecipeSecondaryFields
            defaultEnabled
            showToggle={false}
            includeHadSecondaryField={false}
          />
          <button className="rounded-lg border border-green-500 bg-green-700 px-4 py-3 font-semibold hover:bg-green-600">
            Confirm rack to secondary
          </button>
        </form>
      </div>
    </div>
  </div>
)}

    {/* Rack to conditioning */}
{hasActive && canContribute && ["Aktiv", "Sekundær", "secondary"].includes(activeBatch.status) && (
  <div className="mt-6 bg-white/5 border border-white/10 rounded-lg p-4">
    <div className="flex w-full items-center justify-between gap-3 font-semibold text-green-300">
      <span className="text-lg">Rack to conditioning</span>
      <ExpandArrowButton
        expanded={openConditioningActive}
        label="rack to conditioning"
        controls="rack-to-conditioning-content"
        onClick={() => setOpenConditioningActive((open) => !open)}
      />
    </div>

    <div
      id="rack-to-conditioning-content"
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        openConditioningActive ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
      }`}
    >
      <div className="overflow-hidden">
        {conditioningSchemaStatus === "ready" ? (
          <form
            action={Actions.rackToConditioning}
            className="mt-4 flex flex-col gap-4"
          >
            <input type="hidden" name="batch_id" value={activeBatch.id} />
            <input type="hidden" name="kar_id" value={kar.id} />
            <p className="text-sm text-white/70">
              Move directly from primary fermentation, or after optional secondary fermentation, into conditioning.
            </p>
            <label className="flex w-full flex-col gap-2 text-sm font-medium">
              Conditioning start date
              <input
                name="conditioning_startdate"
                type="date"
                required
                defaultValue={localDateValue()}
                className="w-full rounded border border-white/20 bg-black/40 p-3"
              />
            </label>
            <input
              type="hidden"
              name="timezone_offset_minutes"
              value={new Date().getTimezoneOffset()}
            />
            <label className="flex flex-col gap-2 text-sm font-medium">
              Conditioning notes (optional)
              <PublicMentionTextarea
                name="conditioning_notes"
                maxLength={3000}
                rows={8}
                className="w-full resize-y rounded border border-white/20 bg-black/40 p-3"
                placeholder="Record your conditioning plan, observations, or anything you want to remember."
              />
            </label>
            <button className="rounded-lg border border-green-500 bg-green-700 px-4 py-3 font-semibold hover:bg-green-600">
              Move batch to conditioning
            </button>
          </form>
        ) : (
          <p role="status" className="mt-4 text-sm text-amber-200">
            {conditioningSchemaStatus === "checking"
              ? "Checking conditioning storage…"
              : "Conditioning is unavailable until the conditioning database migration is applied."}
          </p>
        )}
      </div>
    </div>
  </div>
)}


        

           {hasActive && canContribute && (
  <div id="sg-log" className="scroll-mt-6 bg-white/5 border border-white/10 rounded-lg p-4 mt-6 mb-6">
               <div className="flex w-full items-center justify-between gap-3 font-semibold text-green-300">
      <span className="text-lg">Specific gravity readings</span>
      <ExpandArrowButton
        expanded={openSG}
        label="specific gravity readings"
        controls="specific-gravity-content"
        onClick={() => setOpenSG((open) => !open)}
      />
    </div>

    <div
      id="specific-gravity-content"
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        openSG ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
      }`}
    >
      <div className="overflow-hidden">

        {/* SG input */}
        <div className="mt-4 flex flex-col gap-4">
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={sgValue}
            onChange={(e) => {
              setSgValue(e.target.value);
              setSgError("");
            }}
            placeholder="Enter SG"
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <button
            type="button"
            onClick={saveSG}
            disabled={savingSG}
            className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold disabled:cursor-wait disabled:opacity-60"
          >
            {savingSG ? "Saving…" : "Save SG"}
          </button>
          {sgError && <p role="alert" className="text-sm text-red-300">{sgError}</p>}
        </div>

        {sgReadings.length > 0 && (
          <>
            {!canViewSGGraph && (
              <section
                aria-label="Saved specific gravity readings"
                className="mt-6 rounded-lg border border-white/10 bg-black/30 p-4"
              >
                <h3 className="mb-3 font-semibold text-green-300">Recorded readings</h3>
                <ul className="space-y-2 text-sm text-white/75">
                  {[...sgReadings].reverse().map((reading, index) => (
                    <li
                      key={reading.id ?? `${reading.created_at}-${index}`}
                      className="flex justify-between gap-4"
                    >
                      <time dateTime={reading.created_at}>
                        {new Date(reading.created_at).toLocaleString()}
                      </time>
                      <span className="font-mono">{Number(reading.sg).toFixed(3)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-6" aria-label="SG development graph">
              <h3 className="mb-3 text-xl font-bold text-green-300">
                Development graph
              </h3>
              {canViewSGGraph ? (
                <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                  <BatchSGChart readings={sgReadings} />
                  {currentAbv && (
                    <p className="mt-4 text-center text-lg font-semibold text-green-300">
                      Current ABV: {currentAbv}%
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-center">
                  <p className="text-sm text-white/75">
                    SG readings are saved on every plan. The development graph
                    and current ABV are part of Premium.
                  </p>
                  <a href="/premium" className="mt-2 inline-block text-green-200 underline">
                    Explore Premium
                  </a>
                </div>
              )}
            </section>
          </>
        )}
        </div>
    </div>
  </div>
)}

{/* Finish and bottle the batch */}
{canContribute && hasActive && (
  <div id="finish-batch" className="scroll-mt-6 bg-white/5 border border-white/10 rounded-lg p-4 mt-6">
    <div className="flex w-full items-center justify-between gap-3 font-semibold text-green-300">
      <span className="text-lg">Finish &amp; Bottle</span>
      <ExpandArrowButton
        expanded={openFinish}
        label="finish and bottle batch"
        controls="finish-batch-content"
        onClick={() => setOpenFinish((open) => !open)}
      />
    </div>

    <div
      id="finish-batch-content"
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        openFinish ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <form
          action={Actions.finishBatch}
          className="mt-4 flex flex-col gap-4"
        >
          <input type="hidden" name="batch_id" value={activeBatch.id} />
          <input type="hidden" name="kar_id" value={kar.id} />

          <p className="text-sm text-white/70">
            Record how you bottled or stored this batch and how it turned out.
            These details will be saved with the finished batch.
          </p>
          {lifecycleSchemaMessage && (
            <p role="alert" className="text-sm text-amber-300">
              {lifecycleSchemaMessage}
            </p>
          )}

          <input
            type="number"
            step="0.001"
            name="fg"
            aria-label="Final Gravity (FG)"
            placeholder="Final Gravity (FG)"
            className="p-3 rounded bg-black/40 border border-white/20"
            required
          />

          <label className="flex flex-col gap-2 text-sm font-medium">
            Total finished volume (<UnitSymbol kind="volume" />)
            <UnitInput
              kind="volume"
              name="packaged_volume_l"
              min="0.01"
              step="0.01"
              required
              className="p-3 rounded bg-black/40 border border-white/20"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Bottling or storage method
            <select
              name="packaging_method"
              defaultValue=""
              required
              className="p-3 rounded bg-black/40 border border-white/20"
            >
              <option value="" disabled>Select how it was bottled or stored</option>
              <option value="Bottles">Bottles</option>
              <option value="Keg">Keg</option>
              <option value="Cans">Cans</option>
              <option value="Mixed packaging">Mixed bottles / cans</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Volume bottled, if applicable (<UnitSymbol kind="volume" />)
              <UnitInput
                kind="volume"
                name="bottle_volume_l"
                min="0"
                step="0.01"
                className="p-3 rounded bg-black/40 border border-white/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Volume kegged, if applicable (<UnitSymbol kind="volume" />)
              <UnitInput
                kind="volume"
                name="keg_volume_l"
                min="0"
                step="0.01"
                className="p-3 rounded bg-black/40 border border-white/20"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Number of bottles, cans, or other containers (optional)
            <input
              name="package_count"
              type="number"
              min="1"
              step="1"
              className="p-3 rounded bg-black/40 border border-white/20"
            />
          </label>

          <fieldset className="flex flex-col gap-4 rounded-lg border border-white/10 p-4">
            <legend className="px-2 font-semibold">Carbonation (optional)</legend>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Method
              <select
                name="carbonation_method"
                defaultValue=""
                className="p-3 rounded bg-black/40 border border-white/20"
              >
                <option value="">Not recorded</option>
                <option value="Bottle conditioned">Bottle conditioned</option>
                <option value="Force carbonated">Force carbonated</option>
                <option value="Naturally carbonated">Naturally carbonated</option>
                <option value="Still">Still</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Target carbonation (volumes of CO₂)
                <input
                  name="target_carbonation_volumes"
                  type="number"
                  min="0.1"
                  max="6"
                  step="0.1"
                  className="p-3 rounded bg-black/40 border border-white/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Priming sugar (g)
                <input
                  name="priming_sugar_g"
                  type="number"
                  min="0"
                  step="0.1"
                  className="p-3 rounded bg-black/40 border border-white/20"
                />
              </label>
            </div>
          </fieldset>

          <label className="flex w-full flex-col gap-2 text-sm font-medium">
            Finishing notes (optional)
            <PublicMentionTextarea
              name="finished_notes"
              rows={6}
              placeholder="Record anything notable about finishing this batch."
              className="min-h-32 w-full resize-y rounded border border-white/20 bg-black/40 p-3"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Tasting notes (optional; you can add these later)
            <PublicMentionTextarea
              name="tasting_notes"
              rows={6}
              className="min-h-32 w-full resize-y rounded border border-white/20 bg-black/40 p-3"
            />
          </label>

          <label className="flex items-center gap-2 text-sm opacity-80">
            <input type="checkbox" name="save_as_recipe" />
            Save as recipe
          </label>

          <button
            disabled={lifecycleSchemaStatus !== "ready"}
            className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {lifecycleSchemaStatus === "checking"
              ? "Checking batch storage…"
              : "Finish & Bottle"}
          </button>
        </form>
      </div>
    </div>
  </div>
)}

{/* Cancel batch */}
{canContribute && hasActive && (
  <>
    <form
      ref={cancelBatchFormRef}
      action={Actions.cancelBatch}
      onSubmit={(event) => {
        if (!cancelBatchConfirmedRef.current) {
          event.preventDefault();
          setConfirmCancelBatch(true);
        }
      }}
      className="mt-8 mb-4"
    >
      <input type="hidden" name="batch_id" value={activeBatch.id} />
      <input type="hidden" name="kar_id" value={kar.id} />

      <button
        type="submit"
        className="w-full rounded-lg border border-white/20 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        Cancel batch
      </button>
    </form>
    <ConfirmDialog
      open={confirmCancelBatch}
      title="Cancel this batch?"
      message="This will cancel the active batch and free the vessel. This action cannot be undone."
      confirmLabel="Cancel batch"
      onConfirm={() => {
        if (!cancelBatchFormRef.current) return false;
        cancelBatchConfirmedRef.current = true;
        cancelBatchFormRef.current?.requestSubmit();
        cancelBatchConfirmedRef.current = false;
        return true;
      }}
      onCancel={() => setConfirmCancelBatch(false)}
    />

    <div className="w-full h-px bg-white/10 my-6"></div>
  </>
)}

{hasActive && isOwner && splitVessels.length >= 2 && (
  <SplitBatchPanel
    key={`split-${activeBatch.id}`}
    batch={activeBatch}
    vessels={splitVessels}
  />
)}

{hasActive && isOwner && (
  <BatchReminders
    key={`reminders-${activeBatch.id}`}
    batchId={activeBatch.id}
    stage={
      activeBatch.status === "Conditioning"
        ? "conditioning"
        : ["Sekundær", "secondary"].includes(activeBatch.status)
          ? "secondary"
          : "primary"
    }
  />
)}

{hasActive && (
  <>
    {(isContributor || hasSharedContributors) && (
      <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-green-300">
            Vessel activity
          </h2>
          <ExpandArrowButton
            expanded={openSharedNotes}
            label="vessel activity"
            controls="vessel-activity-content"
            onClick={() => setOpenSharedNotes((open) => !open)}
          />
        </div>
        {openSharedNotes && (
          <div id="vessel-activity-content" className="mt-4">
            <VesselActivity karId={kar.id} />
          </div>
        )}
      </section>
    )}
    <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold text-green-300">
        Batch notes &amp; pictures
      </h2>
      <div id="batch-notes-content" className="mt-4">
        <KarNotesClient
          batchId={activeBatch.id}
          karId={kar.id}
          userId={user.id}
          notes={notes}
        />
      </div>
    </section>
  </>
)}
  </div>
    </main>
  );
}