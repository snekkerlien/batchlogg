"use client";

import { useState, useEffect, useRef } from "react";
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
import QRCode from "qrcode";


import { translateOldRecipe } from "@/lib/translateOldRecipe";
import { Qty, UnitInput, UnitSymbol, useUnits } from "@/app/components/Units";
import BatchEditTypeFields from "./BatchEditTypeFields";
import { formatSecondaryAdditions } from "@/lib/recipes/secondaryAdditions";
import RecipeSecondaryFields from "@/app/my-recipes/new/RecipeSecondaryFields";
import VesselActivity from "./VesselActivity";

const BatchSGChart = dynamic(
  () => import("@/app/components/BatchSGChart"),
  { ssr: false, loading: () => <p className="text-sm text-white/60">Loading chart…</p> }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function ebcToHex(ebc: number) {
  if (!ebc || ebc <= 0) return "#F3F3F3"; // very pale

  // Convert EBC → SRM
  const srm = ebc / 1.97;

  // SRM → RGB (Morey approximation)
  const r = Math.max(0, Math.min(255, 255 * Math.pow(0.975, srm)));
  const g = Math.max(0, Math.min(255, 245 * Math.pow(0.88, srm)));
  const b = Math.max(0, Math.min(255, 220 * Math.pow(0.7, srm)));

  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
  );
}


function daysSince(dateString: string) {
  const start = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return days;
}

function dayLabel(days: number) {
  return days === 1 ? "day" : "days";
}



export default function KarPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inventoryError = searchParams.get("inventory_error");
  const { label } = useUnits();
  const [openSecondary, setOpenSecondary] = useState(false);
  const [openSecondaryActive, setOpenSecondaryActive] = useState(false);
  const [openFinish, setOpenFinish] = useState(false);
  const [openMove, setOpenMove] = useState(false);
  const [openSharing, setOpenSharing] = useState(false);
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
  const [sgPremiumRequired, setSgPremiumRequired] = useState(false);
  const [openSG, setOpenSG] = useState(false);
  const [sgValue, setSgValue] = useState("");
  const [sgError, setSgError] = useState("");
  const [savingSG, setSavingSG] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrPng, setQrPng] = useState<string | null>(null);
  const [karLoading, setKarLoading] = useState(true);

  const [openStyleSelect, setOpenStyleSelect] = useState(false);
  const [freeVessels, setFreeVessels] = useState<any[]>([]);
  const [vesselNumber, setVesselNumber] = useState<number | null>(null);
  const latestSG = sgReadings.length > 0
    ? Number(sgReadings[sgReadings.length - 1].sg)
    : null;

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
    supabase
      .from("batches")
      .select("*")
      .eq("aktivt_kar", kar.id)
      .in("status", ["Aktiv", "Sekundær", "secondary"])
      .order("created_at", { ascending: false })
      .maybeSingle()
      .then(({ data }) => setActiveBatch(data));
  }, [kar]);



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
          .in("status", ["Aktiv", "Sekundær", "secondary"]),
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
        const result: { readings?: any[]; error?: string } = await response.json();
        if (response.status === 403) {
          if (active) {
            setSgPremiumRequired(true);
            setSgReadings([]);
          }
          return;
        }
        if (!response.ok) throw new Error(result.error || "Could not load SG readings");
        if (active) {
          setSgPremiumRequired(false);
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
    if (response.status === 403) setSgPremiumRequired(true);
    if (!response.ok) throw new Error(result.error || "Could not save SG reading");

    const readingsResponse = await fetch(
      `/api/sg?batchId=${encodeURIComponent(activeBatch.id)}`,
      { credentials: "include", cache: "no-store" }
    );
    const readingsResult: { readings?: any[]; error?: string } =
      await readingsResponse.json();
    if (!readingsResponse.ok) {
      throw new Error(readingsResult.error || "Could not load SG readings");
    }

    setSgValue("");
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
    <button
      type="button"
      onClick={() => setOpenSharing((open) => !open)}
      aria-expanded={openSharing}
      className="w-full flex items-center justify-between font-semibold text-green-300"
    >
      Share vessel with friends
      <span
        className={`text-white text-xl transition-transform duration-300 ${
          openSharing ? "rotate-90" : "rotate-180"
        }`}
      >
        ▶
      </span>
    </button>
    {openSharing && (
      <div className="mt-4">
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
      ? ["Sekundær", "secondary"].includes(activeBatch.status)
        ? "Secondary fermentation"
        : "Active fermentation"
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
    <h2 className="text-2xl font-semibold mb-4 text-center">
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
            <label className="font-semibold">Batch name</label>
            <input name="name" defaultValue={activeBatch.name}
              className="p-3 rounded bg-black/40 border border-white/20" />

            <label className="font-semibold">
              Volume (<UnitSymbol kind="volume" />)
            </label>
            <UnitInput
              kind="volume"
              name="volume_l"
              defaultValue={String(activeBatch.volume_l ?? "")}
              className="p-3 rounded bg-black/40 border border-white/20"
            />

            <label className="font-semibold">Start date</label>
            <input name="startdato" type="date"
              defaultValue={activeBatch.startdato.split("T")[0]}
              className="p-3 rounded bg-black/40 border border-white/20" />

            <label className="font-semibold">Original Gravity (OG)</label>
            <input name="og" type="number" step="0.001"
              defaultValue={activeBatch.og}
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

      

      {/* Batch info */}
      <p className="opacity-80">Batch ID: {activeBatch.batchnummer}</p>
      <p className="opacity-80">
        Start date: {new Date(activeBatch.startdato).toLocaleDateString("en-US")}
        <span className="ml-2 opacity-70">
          ({daysSince(activeBatch.startdato)} {dayLabel(daysSince(activeBatch.startdato))})
        </span>
      </p>

      <p className="opacity-80">Batch volume: <Qty kind="volume" value={activeBatch.volume_l} /></p>
      <p className="opacity-80">Original Gravity (OG): {activeBatch.og}</p>

      {(activeBatch.type === "Beer" || activeBatch.type === "Braggot") && (
        <>
          {activeBatch.ibu !== null && (
            <p className="opacity-80">
              IBU: {Number(activeBatch.ibu).toFixed(0)}
            </p>
          )}

          {activeBatch.ebc !== null && (
            <div className="flex items-center gap-2 opacity-80">
              <p>
                EBC {activeBatch.beer_subtype === "fresh_wort_kit" ? "(from kit)" : "(calculated)"}:{" "}
                {Number(activeBatch.ebc).toFixed(0)}
              </p>
              <span
                className="inline-block w-6 h-6 rounded border border-white/30"
                style={{ backgroundColor: ebcToHex(Number(activeBatch.ebc)) }}
              ></span>
            </div>
          )}
        </>
      )}

      <p className="opacity-80">
        Racked to secondary on{" "}
        {new Date(activeBatch.secondary_startdate).toLocaleDateString("en-US")}
      </p>

      {activeBatch.secondary_additions && (
        <p className="opacity-80 mt-2 whitespace-pre-wrap">
          Secondary additions:<br />
          {formatSecondaryAdditions(activeBatch.secondary_additions)}
        </p>
      )}

      <p className="opacity-80 mt-2 whitespace-pre-wrap">
        Secondary notes:<br />
        {activeBatch.secondary_notes?.trim() || "No secondary notes recorded."}
      </p>

      <BatchRecipeCard batch={activeBatch} />
      <p className="opacity-80 mt-4">
        Created: {new Date(activeBatch.created_at).toLocaleDateString("en-US")}
      </p>
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
            <label className="font-semibold">Batch name</label>
            <input
              name="name"
              defaultValue={activeBatch.name}
              className="p-3 rounded bg-black/40 border border-white/20"
            />
      
            <label className="font-semibold">
              Volume (<UnitSymbol kind="volume" />)
            </label>
            <UnitInput
              kind="volume"
              name="volume_l"
              defaultValue={String(activeBatch.volume_l ?? "")}
              className="p-3 rounded bg-black/40 border border-white/20"
            />
      
            <label className="font-semibold">Start date</label>
            <input
              name="startdato"
              type="date"
              defaultValue={activeBatch.startdato.split("T")[0]}
              className="p-3 rounded bg-black/40 border border-white/20"
            />
      
            <label className="font-semibold">Original Gravity (OG)</label>
            <input
              name="og"
              type="number"
              step="0.001"
              defaultValue={activeBatch.og}
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
      
                  
                    <p className="opacity-80">Batch ID: {activeBatch.batchnummer}</p>
                    <p className="opacity-80">
                      Start date: {new Date(activeBatch.startdato).toLocaleDateString("en-US")}
                      <span className="ml-2 opacity-70">
                        ({daysSince(activeBatch.startdato)} {dayLabel(daysSince(activeBatch.startdato))})
                      </span>
                    </p>
                    <p className="opacity-80">Original Gravity (OG): {activeBatch.og}</p>
                    <p className="opacity-80">Batch volume: <Qty kind="volume" value={activeBatch.volume_l} /></p>
                    <p className="opacity-80">Status: Primary fermentation</p>
      
                    {(activeBatch.type === "Beer" || activeBatch.type === "Braggot") && (
        <>
          {activeBatch.ibu !== null && (
            <p className="opacity-80">
              IBU: {Number(activeBatch.ibu).toFixed(0)}
            </p>
          )}
      
          {activeBatch.ebc !== null && (
        <div className="flex items-center gap-2 opacity-80">
          <p>
            EBC {activeBatch.beer_subtype === "fresh_wort_kit" ? "(from kit)" : "(calculated)"}:{" "}
            {Number(activeBatch.ebc).toFixed(0)}
          </p>
          <span
            className="inline-block w-6 h-6 rounded border border-white/30"
            style={{ backgroundColor: ebcToHex(Number(activeBatch.ebc)) }}
          ></span>
        </div>
      )}
        </>
      )}
      
                    <BatchRecipeCard batch={activeBatch} />
    </div>

      <p className="opacity-80 mt-4">
        Created: {new Date(activeBatch.created_at).toLocaleDateString("en-US")}
      </p>
    </>
  )}



    {/* ⭐ Rack to secondary */}
{hasActive && canContribute && activeBatch.status === "Aktiv" && (
  <div className="mt-6 bg-white/5 border border-white/10 rounded-lg p-4">
    <button
      type="button"
      onClick={() => setOpenSecondaryActive(!openSecondaryActive)}
      className="w-full flex items-center justify-between font-semibold text-green-300 cursor-pointer"
    >
      Rack to secondary
      <span
        className={`text-white text-xl transition-transform duration-300 ${
          openSecondaryActive ? "rotate-90" : "rotate-180"
        }`}
      >
        ▶
      </span>
    </button>

    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        openSecondaryActive ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <form
          action={Actions.moveToSecondary}
          className="mt-4 flex flex-col gap-4"
        >
          <input type="hidden" name="batch_id" value={activeBatch.id} />
          <input type="hidden" name="kar_id" value={kar.id} />

          <RecipeSecondaryFields
            defaultEnabled
            showToggle={false}
            includeHadSecondaryField={false}
          />

          <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
            Confirm rack to secondary
          </button>
        </form>
      </div>
    </div>
  </div>
)}


        

           {hasActive && canContribute && (
  <div id="sg-log" className="scroll-mt-6 bg-white/5 border border-white/10 rounded-lg p-4 mt-6 mb-6">
               {sgPremiumRequired ? (
                 <div className="text-center">
                   <p className="text-white/80">SG readings and development history are part of Premium.</p>
                   <a href="/premium" className="mt-3 inline-block text-green-200 underline">Explore Premium</a>
                 </div>
               ) : (
                 <>
               <button
      type="button"
      onClick={() => setOpenSG(!openSG)}
      className="w-full flex items-center justify-between font-semibold text-green-300 cursor-pointer"
    >
      Specific Gravity Development (SG)
      <span
        className={`text-white text-xl transition-transform duration-300 ${
          openSG ? "rotate-90" : "rotate-180"
        }`}
      >
        ▶
      </span>
    </button>

    <div
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

        {/* SG graph */}
        {sgReadings.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xl font-bold mb-3 text-green-300">
              Development graph
            </h3>

            <div className="bg-black/40 p-4 rounded-lg border border-white/10">
              <BatchSGChart readings={sgReadings} />
            </div>

            {/* Current ABV using latest SG */}
            {(() => {
              const latestSG =
                sgReadings.length > 0
                  ? Number(sgReadings[sgReadings.length - 1].sg)
                  : null;

              const currentAbv =
                activeBatch?.og && latestSG && !isNaN(latestSG)
                  ? ((Number(activeBatch.og) - latestSG) * 131.25).toFixed(2)
                  : null;

              return currentAbv ? (
                <p className="text-center text-lg font-semibold mt-4 text-green-300">
                  Current ABV: {currentAbv}%
                </p>
              ) : null;
            })()}
          </div>
        )}
        </div>
    </div>
      </>
    )}
  </div>
)}

{/* Finish batch under Rack to secondary */}
{canContribute && hasActive && (
  <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-6">
    <button
      type="button"
      onClick={() => setOpenFinish(!openFinish)}
      className="w-full flex items-center justify-between font-semibold text-green-300 cursor-pointer"
    >
      Finish batch
      <span
        className={`text-white text-xl transition-transform duration-300 ${
          openFinish ? "rotate-90" : "rotate-180"
        }`}
      >
        ▶
      </span>
    </button>

    <div
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

          <input
            type="number"
            step="0.001"
            name="fg"
            placeholder="Final Gravity (FG)"
            className="p-3 rounded bg-black/40 border border-white/20"
            required
          />

          <textarea
            name="finished_notes"
            placeholder="Finishing notes"
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="flex items-center gap-2 text-sm opacity-80">
            <input type="checkbox" name="save_as_recipe" />
            Save as recipe
          </label>

          <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
            Finish batch
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
        className="w-full px-2 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-sm"
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

    {/* Move batch to another vessel */}
{hasActive && isOwner && freeVessels.length > 0 && (
  <div className="mt-6 bg-white/5 border border-white/10 rounded-lg p-4">
    <button
      type="button"
      onClick={() => setOpenMove(!openMove)}
      className="w-full flex items-center justify-between font-semibold text-green-300 cursor-pointer"
    >
      Move to another vessel
      <span
        className={`text-white text-xl transition-transform duration-300 ${
          openMove ? "rotate-90" : "rotate-180"
        }`}
      >
        ▶
      </span>
    </button>

    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        openMove ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <form
          action={Actions.moveBatchToVessel}
          className="mt-4 flex flex-col gap-3"
        >
          <input type="hidden" name="batch_id" value={activeBatch.id} />
          <input type="hidden" name="kar_id" value={kar.id} />
          <select
            name="target_kar_id"
            required
            defaultValue=""
            className="p-3 rounded bg-black/40 border border-white/20"
          >
            <option value="" disabled>Select empty vessel</option>
            {freeVessels.map((v) => (
              <option key={v.id} value={v.id}>
                Vessel {v.nummer}
              </option>
            ))}
          </select>
          <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
            Move batch
          </button>
        </form>
      </div>
    </div>
  </div>
)}

{hasActive && isOwner && (
  <BatchReminders key={activeBatch.id} batchId={activeBatch.id} />
)}

{hasActive && (
  <>
    {(isContributor || hasSharedContributors) && (
      <VesselActivity karId={kar.id} />
    )}
    <KarNotesClient
      batchId={activeBatch.id}
      karId={kar.id}
      userId={user.id}
      notes={notes}
    />
  </>
)}
  </div>
    </main>
  );
}