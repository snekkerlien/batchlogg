"use client";

import { useState } from "react";
import * as Actions from "../../actions";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";

export default function NewBeerPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false);

  // Dynamic malt list
  const [malts, setMalts] = useState<
    { name: string; amount: string }[]
  >([]);

  function addMalt() {
    setMalts([...malts, { name: "", amount: "" }]);
  }

  function removeMalt(index: number) {
    const updated = [...malts];
    updated.splice(index, 1);
    setMalts(updated);
  }

  // Dynamic hop list
  const [hops, setHops] = useState<
    { name: string; amount: string; time: string }[]
  >([]);

  function addHop() {
    setHops([...hops, { name: "", amount: "", time: "" }]);
  }

  function removeHop(index: number) {
    const updated = [...hops];
    updated.splice(index, 1);
    setHops(updated);
  }
  const [dryHops, setDryHops] = useState<
  { name: string; amount: string; contact: string }[]
>([]);

function addDryHop() {
  setDryHops([...dryHops, { name: "", amount: "", contact: "" }]);
}

function removeDryHop(index: number) {
  const updated = [...dryHops];
  updated.splice(index, 1);
  setDryHops(updated);
}

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10">

        {/* MENU BUTTON */}
                <div className="absolute top-2 sm:top-4 right-4 z-40">
                  <MenuOverlay />
                </div>
        
                {/* BACK BUTTON */}
                <div className="absolute top-2 sm:top-4 left-4 z-40">
                  <BackButton />
                </div>

        {/* HEADER */}
        <h1 className="text-4xl font-bold mb-2 text-center">New Beer Batch</h1>
        <p className="text-center opacity-80 mb-10">
          Fill out the details below to start a new beer batch.
        </p>

        <form
          action={Actions.createBatch}
          className="flex flex-col gap-6"
          onSubmit={() => setLoading(true)}
        >
          {/* Hidden fields */}
          <input type="hidden" name="kar" value={params.id} />
          <input type="hidden" name="type" value="Beer" />

          {/* Batch name */}
          <div>
            <label className="block mb-1 font-semibold">Batch name</label>
            <input
              name="name"
              placeholder="Example: Pale Ale, IPA, Stout"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          {/* Volume */}
          <div>
            <label className="block mb-1 font-semibold">Volume (L)</label>
            <input
              name="volume_l"
              type="text"
              placeholder="Example: 20"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          <div>
  <label className="block mb-1 font-semibold">Boil Volume (L)</label>
  <input
    name="boil_volume_l"
    type="text"
    placeholder="Example: 25"
    className="w-full p-3 rounded bg-black/40 border border-white/20"
    required
  />
</div>


          {/* Start date */}
          <div>
            <label className="block mb-1 font-semibold">Start date</label>
            <input
              name="startdato"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          {/* OG */}
          <div>
            <label className="block mb-1 font-semibold">Original Gravity (OG)</label>
            <input
              name="og"
              type="number"
              step="0.001"
              placeholder="Example: 1.050"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          <div>
  <label className="block mb-2 font-semibold">Malt additions</label>

  {malts.map((m, i) => (
  <div
    key={i}
    className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full"
  >
    {/* Malt type */}
    <input
      placeholder="Malt type"
      className="p-3 rounded bg-black/40 border border-white/20 flex-1 min-w-[240px]"
      value={m.name}
      onChange={(e) => {
        const updated = [...malts];
        updated[i].name = e.target.value;
        setMalts(updated);
      }}
    />

    {/* Amount */}
    <input
      placeholder="Amount (kg)"
      type="text"
      className="p-3 rounded bg-black/40 border border-white/20 w-32"
      value={m.amount}
      onChange={(e) => {
        const updated = [...malts];
        updated[i].amount = e.target.value;
        setMalts(updated);
      }}
    />

    {/* Remove */}
    <button
      type="button"
      onClick={() => removeMalt(i)}
      className="px-3 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-lg text-sm"
    >
      Remove
    </button>
  </div>
))}



  <button
    type="button"
    onClick={addMalt}
    className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
  >
    + Add malt
  </button>
</div>


          {/* Hidden JSON field */}
          <input type="hidden" name="malts_json" value={JSON.stringify(malts)} />

          {/* Dynamic hop additions */}
          <div>
  <label className="block mb-2 font-semibold">Hop additions</label>

  {hops.map((h, i) => (
  <div
    key={i}
    className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full"
  >
    {/* Hop type */}
    <input
      placeholder="Hop type"
      className="p-3 rounded bg-black/40 border border-white/20 flex-1 min-w-[240px]"
      value={h.name}
      onChange={(e) => {
        const updated = [...hops];
        updated[i].name = e.target.value;
        setHops(updated);
      }}
    />

    {/* Amount */}
    <input
      placeholder="Amount (g)"
      type="text"
      className="p-3 rounded bg-black/40 border border-white/20 w-28"
      value={h.amount}
      onChange={(e) => {
        const updated = [...hops];
        updated[i].amount = e.target.value;
        setHops(updated);
      }}
    />

    {/* Boil time */}
    <input
      placeholder="Boil time (min)"
      type="text"
      className="p-3 rounded bg-black/40 border border-white/20 w-32"
      value={h.time}
      onChange={(e) => {
        const updated = [...hops];
        updated[i].time = e.target.value;
        setHops(updated);
      }}
    />

    {/* Remove */}
    <button
      type="button"
      onClick={() => removeHop(i)}
      className="px-3 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-lg text-sm"
    >
      Remove
    </button>
  </div>
))}


  <button
    type="button"
    onClick={addHop}
    className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
  >
    + Add hop
  </button>
</div>

{/* Dry hop additions */}
<div>
  <label className="block mb-2 font-semibold">Dry hop additions</label>

  {dryHops.map((h, i) => (
  <div
    key={i}
    className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full"
  >
    {/* Hop type */}
    <input
      placeholder="Hop type"
      className="p-3 rounded bg-black/40 border border-white/20 flex-1 min-w-[240px]"
      value={h.name}
      onChange={(e) => {
        const updated = [...dryHops];
        updated[i].name = e.target.value;
        setDryHops(updated);
      }}
    />

    {/* Amount */}
    <input
      placeholder="Amount (g)"
      type="text"
      className="p-3 rounded bg-black/40 border border-white/20 w-28"
      value={h.amount}
      onChange={(e) => {
        const updated = [...dryHops];
        updated[i].amount = e.target.value;
        setDryHops(updated);
      }}
    />

    {/* Contact time */}
    <input
      placeholder="Contact time (days)"
      type="text"
      className="p-3 rounded bg-black/40 border border-white/20 w-42"
      value={h.contact}
      onChange={(e) => {
        const updated = [...dryHops];
        updated[i].contact = e.target.value;
        setDryHops(updated);
      }}
    />

    {/* Remove */}
    <button
      type="button"
      onClick={() => removeDryHop(i)}
      className="px-3 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-lg text-sm"
    >
      Remove
    </button>
  </div>
))}


  <button
    type="button"
    onClick={addDryHop}
    className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
  >
    + Add dry hop
  </button>
</div>

<input type="hidden" name="dry_hops_json" value={JSON.stringify(dryHops)} />




          {/* Hidden JSON field */}
          <input type="hidden" name="hops_json" value={JSON.stringify(hops)} />

          {/* Boil time */}
          <div>
            <label className="block mb-1 font-semibold">Total boil time (minutes)</label>
            <input
              name="boil_time"
              type="number"
              step="1"
              placeholder="Example: 60"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Yeast */}
          <div>
            <label className="block mb-1 font-semibold">Yeast strain</label>
            <input
              name="yeast"
              placeholder="Example: US-05, S-04, Kveik"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Additives */}
          <div>
            <label className="block mb-1 font-semibold">Additives</label>
            <textarea
              name="additives"
              placeholder="Irish Moss, gypsum, CaCl₂, nutrient..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </div>

          {/* Full process */}
          <div>
            <label className="block mb-1 font-semibold">Full process</label>
            <textarea
              name="full_process"
              placeholder="Mash schedule, hop schedule, fermentation plan..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-40"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block mb-1 font-semibold">Notes</label>
            <textarea
              name="notes"
              placeholder="Any additional notes about the batch..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </div>

          {/* Submit */}
          <button
            disabled={loading}
            className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            {loading ? "Creating..." : "Create batch"}
          </button>
        </form>
      </div>
    </main>
  );
}
