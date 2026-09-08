"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as Actions from "./actions";
import { KarNotesClient } from "./KarNotesClient";
import MenuOverlay from "@/app/components/MenuOverlay";
import { Line } from "react-chartjs-2";
import QRCode from "qrcode";


import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { translateOldRecipe } from "@/lib/translateOldRecipe";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type Fruit = { name: string; amount: string; unit: string };
type Malt = { name: string; amount: string; unit: string };
type Hop = { name: string; amount: string; unit: string; boil: string };
type Ingredient = { name: string; amount: string; unit: string };


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [openSecondary, setOpenSecondary] = useState(false);
  const [openSecondaryActive, setOpenSecondaryActive] = useState(false);
  const [openFinish, setOpenFinish] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [kar, setKar] = useState<any>(null);
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [historyBatch, setHistoryBatch] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEdit, setOpenEdit] = useState(false);
  const [sgReadings, setSgReadings] = useState<any[]>([]);
  const [openSG, setOpenSG] = useState(false);
  const [sgValue, setSgValue] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [qrPng, setQrPng] = useState<string | null>(null);
  const [karLoading, setKarLoading] = useState(true);

  const [openStyleSelect, setOpenStyleSelect] = useState(false);




  
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
    .eq("user_id", user.id)
    .single()
    .then(({ data }) => {
      setKar(data);
      setKarLoading(false);
    });
}, [user, params.id]);

  useEffect(() => {
    if (!kar) return;
    supabase
      .from("batches")
      .select("*")
      .eq("aktivt_kar", kar.id)
      .in("status", ["Aktiv", "Sekundær"])
      .order("created_at", { ascending: false })
      .maybeSingle()
      .then(({ data }) => setActiveBatch(data));
  }, [kar]);

  // ⭐ Oversett gamle batches til moderne format
useEffect(() => {
  if (!activeBatch) return;

  const translated = translateOldRecipe(activeBatch);
  setActiveBatch(translated);
}, [activeBatch]);


  useEffect(() => {
    if (!kar || activeBatch) return;
    supabase
      .from("batches")
      .select("*")
      .eq("user_id", kar.user_id)
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

  supabase
    .from("sg_readings")
    .select("*")
    .eq("batch_id", activeBatch.id)
    .order("created_at", { ascending: true })
    .then(({ data }) => setSgReadings(data ?? []));
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
    window.location.href = `/auth/login?redirect=/kar/${params.id}`;
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
  onClick={() => (window.location.href = "/dashboard")}
  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition"
>
  Go back
</button>

      </div>
    </main>
  );
}

  const isOwner = kar.user_id === user.id;
  const hasActive = !!activeBatch;
  const hasHistory = !!historyBatch;

async function saveSG() {
  const { data, error } = await supabase
    .from("sg_readings")
    .insert({
      batch_id: activeBatch.id,
      sg: Number(sgValue),
    });

  if (!error) {
    setSgValue("");
    // Refresh SG list
    supabase
      .from("sg_readings")
      .select("*")
      .eq("batch_id", activeBatch.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setSgReadings(data ?? []));
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


  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => (window.location.href = "/dashboard")}
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
    <p className="text-sm opacity-80">Vessel Visibility</p>

    <div
      onClick={toggleVisibility}
      className={`w-14 h-7 rounded-full cursor-pointer transition relative ${
        kar.is_public ? "bg-green-500" : "bg-zinc-600"
      }`}
    >
      <div
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition ${
          kar.is_public ? "translate-x-7" : ""
        }`}
      ></div>
    </div>

    <p className="text-sm opacity-80">
      {kar.is_public ? "visible" : "hidden"}
    </p>
  </div>
)}

{/* HEADER */}
<h1 className="text-4xl font-bold mb-2 text-center">
  Vessel
</h1>

<h2 className="text-xl text-center opacity-80 mb-10">
  {activeBatch
    ? activeBatch.status === "Sekundær"
      ? "Secondary fermentation"
      : "Active fermentation"
    : ""}
</h2>



        {/* EMPTY VESSEL */}
{!activeBatch && (
  <>
    <p className="text-center opacity-70 mb-6">
      This vessel is currently empty.
    </p>

    {user.id === kar.user_id && (
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
              window.location.href = `/kar/${kar.id}/new/${type.toLowerCase()}`;
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
        {hasActive && activeBatch?.status === "Sekundær" && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Secondary fermentation
            </h2>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">
              <div className="flex items-center justify-between mb-2">
  <h3 className="text-xl font-bold text-green-300">
    {activeBatch.name}
  </h3>

  {isOwner && (
    <button
      type="button"
      onClick={() => setOpenEdit(!openEdit)}
      className="font-semibold text-green-300 cursor-pointer"
    >
      Edit batch
    </button>
  )}
</div>

{openEdit && (
  <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-4">
    <form action={Actions.updateBatch} className="flex flex-col gap-4">
      <input type="hidden" name="batch_id" value={activeBatch.id} />
      <input type="hidden" name="kar_id" value={kar.id} />

      {/* COMMON FIELDS */}
      <label className="font-semibold">Batch name</label>
      <input
        name="name"
        defaultValue={activeBatch.name}
        className="p-3 rounded bg-black/40 border border-white/20"
      />

      <label className="font-semibold">Volume (L)</label>
      <input
        name="volume_l"
        type="number"
        step="0.1"
        defaultValue={activeBatch.volume_l}
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

      {/* TYPE-SPECIFIC FIELDS */}
      {activeBatch.type === "Mead" && (
        <>
          <label className="font-semibold">Honey type</label>
          <input
            name="honey_type"
            defaultValue={activeBatch.honey_type}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Honey amount (kg)</label>
          <input
            name="honey_amount"
            type="number"
            step="0.01"
            defaultValue={activeBatch.honey_amount}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Additives</label>
          <textarea
            name="additives"
            defaultValue={activeBatch.additives}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Full process</label>
          <textarea
            name="full_process"
            defaultValue={activeBatch.full_process}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Notes</label>
          <textarea
            name="notes"
            defaultValue={activeBatch.notes}
            className="p-3 rounded bg-black/40 border border-white/20"
          />
        </>
      )}

      {activeBatch.type === "Wine" && (
        <>
          <label className="font-semibold">Juice type</label>
          <input
            name="juice_type"
            defaultValue={activeBatch.juice_type}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Sugar added (kg)</label>
          <input
            name="sugar_amount"
            type="number"
            step="0.01"
            defaultValue={activeBatch.sugar_amount}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Additives</label>
          <textarea
            name="additives"
            defaultValue={activeBatch.additives}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Full process</label>
          <textarea
            name="full_process"
            defaultValue={activeBatch.full_process}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Notes</label>
          <textarea
            name="notes"
            defaultValue={activeBatch.notes}
            className="p-3 rounded bg-black/40 border border-white/20"
          />
        </>
      )}

      {activeBatch.type === "Beer" && (
  <>
    {/* ⭐ Malt additions */}
<div className="flex flex-col gap-2">
  <label className="font-semibold">Malt additions</label>

  {activeBatch.malts?.map((m: Malt, i: number) => (
    <div key={i} className="flex gap-2 items-center">
      <input
        name={`malts[${i}][name]`}
        defaultValue={m.name}
        placeholder="Malt name"
        className="p-2 rounded bg-black/40 border border-white/20 w-1/2"
      />
      <input
        name={`malts[${i}][amount]`}
        defaultValue={m.amount}
        placeholder="Amount"
        className="p-2 rounded bg-black/40 border border-white/20 w-1/4"
      />
      <input
        name={`malts[${i}][unit]`}
        defaultValue={m.unit}
        placeholder="Unit"
        className="p-2 rounded bg-black/40 border border-white/20 w-1/4"
      />

      {/* ⭐ Remove malt */}
      <button
  type="button"
  onClick={() => {
    const updated = activeBatch.malts.filter((m: Malt, idx: number) => idx !== i);
    setActiveBatch({ ...activeBatch, malts: updated });
  }}
  className="px-2 py-1 bg-red-600/70 hover:bg-red-600 border border-red-500/50 rounded text-sm"
>
  ✕
</button>

    </div>
  ))}

  <button
    type="button"
    onClick={() => {
      const updated = [...activeBatch.malts, { name: "", amount: "", unit: "" }];
      setActiveBatch({ ...activeBatch, malts: updated });
    }}
    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm"
  >
    + Add malt
  </button>
</div>


    {/* ⭐ Hop schedule */}
<div className="flex flex-col gap-2 mt-4">
  <label className="font-semibold">Hop schedule</label>

  {activeBatch.hops?.map((h: Hop, i: number) => (
    <div key={i} className="flex gap-2 items-center">
      <input
        name={`hops[${i}][name]`}
        defaultValue={h.name}
        placeholder="Hop name"
        className="p-2 rounded bg-black/40 border border-white/20 w-1/3"
      />
      <input
        name={`hops[${i}][amount]`}
        defaultValue={h.amount}
        placeholder="Amount"
        className="p-2 rounded bg-black/40 border border-white/20 w-1/4"
      />
      <input
        name={`hops[${i}][unit]`}
        defaultValue={h.unit}
        placeholder="Unit"
        className="p-2 rounded bg-black/40 border border-white/20 w-1/4"
      />
      <input
        name={`hops[${i}][boil]`}
        defaultValue={h.boil}
        placeholder="Boil time"
        className="p-2 rounded bg-black/40 border border-white/20 w-1/4"
      />

      {/* ⭐ Remove hop */}
      <button
  type="button"
  onClick={() => {
    const updated = activeBatch.hops.filter((h: Hop, idx: number) => idx !== i);
    setActiveBatch({ ...activeBatch, hops: updated });
  }}
  className="px-2 py-1 bg-red-600/70 hover:bg-red-600 border border-red-500/50 rounded text-sm"
>
  ✕
</button>
    </div>
  ))}

  <button
    type="button"
    onClick={() => {
      const updated = [...activeBatch.hops, { name: "", amount: "", unit: "", boil: "" }];
      setActiveBatch({ ...activeBatch, hops: updated });
    }}
    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm"
  >
    + Add hop
  </button>
</div>


    {/* ⭐ Boil time */}
    <label className="font-semibold mt-4">Total boil time (min)</label>
    <input
      name="boil_time"
      type="number"
      defaultValue={activeBatch.boil_time}
      className="p-3 rounded bg-black/40 border border-white/20"
    />

    {/* ⭐ Additives */}
    <label className="font-semibold">Additives</label>
    <textarea
      name="additives"
      defaultValue={activeBatch.additives}
      className="p-3 rounded bg-black/40 border border-white/20"
    />

    {/* ⭐ Full process */}
    <label className="font-semibold">Full process</label>
    <textarea
      name="full_process"
      defaultValue={activeBatch.full_process}
      className="p-3 rounded bg-black/40 border border-white/20"
    />

    {/* ⭐ Notes */}
    <label className="font-semibold">Notes</label>
    <textarea
      name="notes"
      defaultValue={activeBatch.notes}
      className="p-3 rounded bg-black/40 border border-white/20"
    />
  </>
)}


      {activeBatch.type === "Other" && (
        <>
          <label className="font-semibold">Additives</label>
          <textarea
            name="additives"
            defaultValue={activeBatch.additives}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Notes</label>
          <textarea
            name="notes"
            defaultValue={activeBatch.notes}
            className="p-3 rounded bg-black/40 border border-white/20"
          />
        </>
      )}

      <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
        Save changes
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

              <p className="opacity-80">Batch volume: {activeBatch.volume_l} L</p>
              <p className="opacity-80">Original Gravity (OG): {activeBatch.og}</p>

              <p className="opacity-80 mt-2">
                Racked to secondary on{" "}
                {new Date(activeBatch.secondary_startdate).toLocaleDateString("en-US")}
              </p>

              {activeBatch.secondary_additions && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Secondary additions:<br />
                  {activeBatch.secondary_additions}
                </p>
              )}

              {activeBatch.secondary_notes && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Secondary notes:<br />
                  {activeBatch.secondary_notes}
                </p>
              )}
              </div>
          </>
        )}

            {/* Rack to secondary REMOVED in secondary */}

            {/* Finish batch */}




        {/* PRIMARY FERMENTATION */}
        {hasActive && activeBatch?.status === "Aktiv" && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Primary fermentation
            </h2>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">
              <div className="flex items-center justify-between mb-2">
  <h3 className="text-xl font-bold text-green-300">
    {activeBatch.name}
  </h3>

  {isOwner && (
    <button
      type="button"
      onClick={() => setOpenEdit(!openEdit)}
      className="font-semibold text-green-300 cursor-pointer"
    >
      Edit batch
    </button>
  )}
</div>

{openEdit && (
  <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-4">
    <form action={Actions.updateBatch} className="flex flex-col gap-4">
      <input type="hidden" name="batch_id" value={activeBatch.id} />
      <input type="hidden" name="kar_id" value={kar.id} />

      {/* COMMON FIELDS */}
      <label className="font-semibold">Batch name</label>
      <input
        name="name"
        defaultValue={activeBatch.name}
        className="p-3 rounded bg-black/40 border border-white/20"
      />

      <label className="font-semibold">Volume (L)</label>
      <input
        name="volume_l"
        type="number"
        step="0.1"
        defaultValue={activeBatch.volume_l}
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

      {/* TYPE-SPECIFIC FIELDS */}
      {activeBatch.type === "Mead" && (
        <>
          <label className="font-semibold">Honey type</label>
          <input
            name="honey_type"
            defaultValue={activeBatch.honey_type}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Honey amount (kg)</label>
          <input
            name="honey_amount"
            type="number"
            step="0.01"
            defaultValue={activeBatch.honey_amount}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Additives</label>
          <textarea
            name="additives"
            defaultValue={activeBatch.additives}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Full process</label>
          <textarea
            name="full_process"
            defaultValue={activeBatch.full_process}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Notes</label>
          <textarea
            name="notes"
            defaultValue={activeBatch.notes}
            className="p-3 rounded bg-black/40 border border-white/20"
          />
        </>
      )}

      {activeBatch.type === "Wine" && (
        <>
          <label className="font-semibold">Juice type</label>
          <input
            name="juice_type"
            defaultValue={activeBatch.juice_type}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Sugar added (kg)</label>
          <input
            name="sugar_amount"
            type="number"
            step="0.01"
            defaultValue={activeBatch.sugar_amount}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Additives</label>
          <textarea
            name="additives"
            defaultValue={activeBatch.additives}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Full process</label>
          <textarea
            name="full_process"
            defaultValue={activeBatch.full_process}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Notes</label>
          <textarea
            name="notes"
            defaultValue={activeBatch.notes}
            className="p-3 rounded bg-black/40 border border-white/20"
          />
        </>
      )}

      {activeBatch.type === "Beer" && (
  <>
    {/* ⭐ Malt additions */}
    <div className="flex flex-col gap-2">
      <label className="font-semibold">Malt additions</label>

      {activeBatch.malts?.map((m: Malt, i: number) => (
        <div key={i} className="flex gap-2 items-center">
          <input name={`malts[${i}][name]`} defaultValue={m.name} className="p-2 rounded bg-black/40 border border-white/20 w-1/2" />
          <input name={`malts[${i}][amount]`} defaultValue={m.amount} className="p-2 rounded bg-black/40 border border-white/20 w-1/4" />
          <input name={`malts[${i}][unit]`} defaultValue={m.unit} className="p-2 rounded bg-black/40 border border-white/20 w-1/4" />

          <button
            type="button"
            onClick={() => {
              const updated = activeBatch.malts.filter((m: Malt, idx: number) => idx !== i);
              setActiveBatch({ ...activeBatch, malts: updated });
            }}
            className="px-2 py-1 bg-red-600/70 hover:bg-red-600 border border-red-500/50 rounded text-sm"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          const updated = [...activeBatch.malts, { name: "", amount: "", unit: "" }];
          setActiveBatch({ ...activeBatch, malts: updated });
        }}
        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm"
      >
        + Add malt
      </button>
    </div>

    {/* ⭐ Hop schedule */}
    <div className="flex flex-col gap-2 mt-4">
      <label className="font-semibold">Hop schedule</label>

      {activeBatch.hops?.map((h: Hop, i: number) => (
        <div key={i} className="flex gap-2 items-center">
          <input name={`hops[${i}][name]`} defaultValue={h.name} className="p-2 rounded bg-black/40 border border-white/20 w-1/3" />
          <input name={`hops[${i}][amount]`} defaultValue={h.amount} className="p-2 rounded bg-black/40 border border-white/20 w-1/4" />
          <input name={`hops[${i}][unit]`} defaultValue={h.unit} className="p-2 rounded bg-black/40 border border-white/20 w-1/4" />
          <input name={`hops[${i}][boil]`} defaultValue={h.boil} className="p-2 rounded bg-black/40 border border-white/20 w-1/4" />

          <button
            type="button"
            onClick={() => {
              const updated = activeBatch.hops.filter((h: Hop, idx: number) => idx !== i);
              setActiveBatch({ ...activeBatch, hops: updated });
            }}
            className="px-2 py-1 bg-red-600/70 hover:bg-red-600 border border-red-500/50 rounded text-sm"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          const updated = [...activeBatch.hops, { name: "", amount: "", unit: "", boil: "" }];
          setActiveBatch({ ...activeBatch, hops: updated });
        }}
        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm"
      >
        + Add hop
      </button>
    </div>

    {/* ⭐ Boil time */}
    <label className="font-semibold mt-4">Total boil time (min)</label>
    <input name="boil_time" type="number" defaultValue={activeBatch.boil_time} className="p-3 rounded bg-black/40 border border-white/20" />

    {/* ⭐ Additives */}
    <label className="font-semibold">Additives</label>
    <textarea name="additives" defaultValue={activeBatch.additives} className="p-3 rounded bg-black/40 border border-white/20" />

    {/* ⭐ Full process */}
    <label className="font-semibold">Full process</label>
    <textarea name="full_process" defaultValue={activeBatch.full_process} className="p-3 rounded bg-black/40 border border-white/20" />

    {/* ⭐ Notes */}
    <label className="font-semibold">Notes</label>
    <textarea name="notes" defaultValue={activeBatch.notes} className="p-3 rounded bg-black/40 border border-white/20" />
  </>
)}


{activeBatch.type === "Other" && (
        <>
          <label className="font-semibold">Additives</label>
          <textarea
            name="additives"
            defaultValue={activeBatch.additives}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <label className="font-semibold">Notes</label>
          <textarea
            name="notes"
            defaultValue={activeBatch.notes}
            className="p-3 rounded bg-black/40 border border-white/20"
          />
        </>
      )}

      <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
        Save changes
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
              <p className="opacity-80">Batch volume: {activeBatch.volume_l} L</p>
              <p className="opacity-80">Status: Primary fermentation</p>

              <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
  <h3 className="text-xl font-bold mb-3 text-green-300">
    Recipe
  </h3>

  <div className="space-y-4 text-sm whitespace-pre-wrap">

    {/* MEAD */}
    {activeBatch.type === "Mead" && (
      <>
        <p><strong>Honey:</strong> {activeBatch.honey_type} – {activeBatch.honey_amount} kg</p>

        {activeBatch.fruits?.length > 0 && (
          <div>
            <strong>Fruits:</strong>
            {activeBatch.fruits.map((f: Fruit, i: number) => (
              <p key={i}>{f.name}: {f.amount}{f.unit}</p>
            ))}
          </div>
        )}

        <p><strong>Additives:</strong><br />{activeBatch.additives}</p>
        <p><strong>Full process:</strong><br />{activeBatch.full_process}</p>
        <p><strong>Notes:</strong><br />{activeBatch.notes}</p>
      </>
    )}

    {/* BEER */}
    {activeBatch.type === "Beer" && (
      <>
        {activeBatch.malts?.length > 0 && (
          <div>
            <strong>Malt additions:</strong>
            {activeBatch.malts.map((m: Malt, i: number) => (
              <p key={i}>{m.name}: {m.amount}{m.unit}</p>
            ))}
          </div>
        )}

        {activeBatch.hops?.length > 0 && (
          <div>
            <strong>Hop schedule:</strong>
            {activeBatch.hops.map((h: Hop, i: number) => (
              <p key={i}>{h.name}: {h.amount}{h.unit} @ {h.boil} min</p>
            ))}
          </div>
        )}

        <p><strong>Total boil time:</strong> {activeBatch.boil_time} min</p>

        <p><strong>Additives:</strong><br />{activeBatch.additives}</p>
        <p><strong>Full process:</strong><br />{activeBatch.full_process}</p>
        <p><strong>Notes:</strong><br />{activeBatch.notes}</p>
      </>
    )}

    {/* BRAGGOT */}
    {activeBatch.type === "Braggot" && (
      <>
        {activeBatch.malts?.length > 0 && (
          <div>
            <strong>Malt additions:</strong>
            {activeBatch.malts.map((m: Malt, i: number) => (
              <p key={i}>{m.name}: {m.amount}{m.unit}</p>
            ))}
          </div>
        )}

        <p><strong>Boil time:</strong> {activeBatch.boil_time} min</p>
        <p><strong>Honey:</strong> {activeBatch.honey_amount} kg</p>

        <p><strong>Additives:</strong><br />{activeBatch.additives}</p>
        <p><strong>Full process:</strong><br />{activeBatch.full_process}</p>
        <p><strong>Notes:</strong><br />{activeBatch.notes}</p>
      </>
    )}

    {/* CIDER / WINE / SELTZER */}
    {(activeBatch.type === "Cider" ||
      activeBatch.type === "Wine" ||
      activeBatch.type === "Seltzer") && (
      <>
        <p><strong>Juice type:</strong> {activeBatch.juice_type}</p>
        <p><strong>Sugar added:</strong> {activeBatch.sugar_amount} kg</p>

        <p><strong>Additives:</strong><br />{activeBatch.additives}</p>
        <p><strong>Full process:</strong><br />{activeBatch.full_process}</p>
        <p><strong>Notes:</strong><br />{activeBatch.notes}</p>
      </>
    )}

    {/* OTHER */}
    {activeBatch.type === "Other" && (
      <>
        {activeBatch.ingredients?.length > 0 && (
          <div>
            <strong>Ingredients:</strong>
            {activeBatch.ingredients.map((ing: Ingredient, idx: number) => (
              <p key={idx}>{ing.name}: {ing.amount}{ing.unit}</p>
            ))}
          </div>
        )}

        {activeBatch.steps?.length > 0 && (
          <div>
            <strong>Process steps:</strong>
            {activeBatch.steps.map((s: string, idx: number) => (
              <p key={idx}>{idx + 1}. {s}</p>
            ))}
          </div>
        )}

        <p><strong>Additives:</strong><br />{activeBatch.additives}</p>
        <p><strong>Notes:</strong><br />{activeBatch.notes}</p>
      </>
    )}

  </div>
</div>


              <p className="opacity-80 mt-4">
                Created: {new Date(activeBatch.created_at).toLocaleDateString("en-US")}
              </p>

              {activeBatch.secondary_startdate && (
                <p className="opacity-80 mt-2">
                  Racked to secondary on{" "}
                  {new Date(activeBatch.secondary_startdate).toLocaleDateString("en-US")}
                </p>
              )}

              {activeBatch.secondary_notes && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Secondary notes:<br />
                  {activeBatch.secondary_notes}
                </p>
              )}

              {activeBatch.secondary_additions && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Secondary additions:<br />
                  {activeBatch.secondary_additions}
                </p>
              )}

              {activeBatch.fg && (
                <p className="opacity-80 mt-2">Final Gravity (FG): {activeBatch.fg}</p>
              )}

              {activeBatch.abv && (
                <p className="opacity-80 mt-2">
                  ABV: {activeBatch.abv.toFixed(2)}%
                </p>
              )}

              {activeBatch.finished_date && (
                <p className="opacity-80 mt-2">
                  Finished:{" "}
                  {new Date(activeBatch.finished_date).toLocaleDateString("en-US")}
                </p>
              )}

              {activeBatch.finished_notes && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Finish notes:<br />
                  {activeBatch.finished_notes}
                </p>
              )}
            </div>

            {isOwner && (
  <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-6 mb-6">
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
            step="0.001"
            value={sgValue}
            onChange={(e) => setSgValue(e.target.value)}
            placeholder="Enter SG"
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <button
            onClick={saveSG}
            className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            Save SG
          </button>
        </div>

        {/* SG graph */}
        {sgReadings.length > 0 && (
          <div className="mt-6">
  <h3 className="text-xl font-bold mb-3 text-green-300">
    Development graph
  </h3>

  <div className="bg-black/40 p-4 rounded-lg border border-white/10">
    <Line
  data={{
    labels: sgReadings.map((r) =>
      new Date(r.created_at).toLocaleDateString()
    ),
    datasets: [
      {
        data: sgReadings.map((r) => Number(r.sg).toFixed(3)),
        borderColor: "rgb(75, 192, 192)",
        tension: 0,          // ⭐ smooth curve
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }}
  options={{
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = Number(context.raw);
          return value.toFixed(3).replace(",", ".");
        },
      },
    },
  },
  scales: {
    y: {
      ticks: {
        callback: (value) =>
          Number(value).toFixed(3).replace(",", "."),
      },
    },
  },
}}

/>
  </div>
</div>

        )}
      </div>
    </div>
  </div>
)}

            
            {/* Rack to secondary */}
{isOwner && hasActive && (
  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
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
        openSecondaryActive
          ? "[grid-template-rows:1fr]"
          : "[grid-template-rows:0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <form
          action={Actions.moveToSecondary}
          className="mt-4 flex flex-col gap-4"
        >
          <input type="hidden" name="batch_id" value={activeBatch.id} />
          <input type="hidden" name="kar_id" value={kar.id} />

          <textarea
            name="secondary_additions"
            placeholder="Secondary additions"
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <textarea
            name="secondary_notes"
            placeholder="Secondary notes"
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
            Confirm rack to secondary
          </button>
        </form>
      </div>
    </div>
  </div>
)}


            {/* Finish batch under Rack to secondary */}
{isOwner && hasActive && (
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
{isOwner && hasActive && (
  <>
    <form action={Actions.cancelBatch} className="mt-8 mb-4">
      <input type="hidden" name="batch_id" value={activeBatch.id} />
      <input type="hidden" name="kar_id" value={kar.id} />

      <button className="w-full px-2 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-md text-sm">
        Cancel batch
      </button>
    </form>

    <div className="w-full h-px bg-white/10 my-6"></div>
  </>
)}

            {hasActive && (
  <KarNotesClient
    batchId={activeBatch.id}
    karId={kar.id}
    userId={user.id}
    notes={notes}
  />
)}

          </>
        )}
      

      </div>
    </main>
  );
}
