"use client";

import { useState } from "react";
import * as Actions from "../../actions";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";

export default function NewBraggotPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false);

  // Dynamic malt list
  const [malts, setMalts] = useState<
    { name: string; amount: string; unit: string }[]
  >([]);

  function addMalt() {
    setMalts([...malts, { name: "", amount: "", unit: "" }]);
  }

  function removeMalt(index: number) {
    const updated = [...malts];
    updated.splice(index, 1);
    setMalts(updated);
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
        <h1 className="text-4xl font-bold mb-2 text-center">New Braggot Batch</h1>
        <p className="text-center opacity-80 mb-10">
          Fill out the details below to start a new braggot batch.
        </p>

        <form
          action={Actions.createBatch}
          className="flex flex-col gap-6"
          onSubmit={() => setLoading(true)}
        >
          {/* Hidden fields */}
          <input type="hidden" name="kar" value={params.id} />
          <input type="hidden" name="type" value="Braggot" />

          {/* Batch name */}
          <div>
            <label className="block mb-1 font-semibold">Batch name</label>
            <input
              name="name"
              placeholder="Example: Honey Ale Braggot"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          {/* Volume */}
          <div>
            <label className="block mb-1 font-semibold">Volume (L)</label>
            <input
              name="volume_l"
              type="number"
              step="0.1"
              placeholder="Example: 10"
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
              placeholder="Example: 1.070"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          {/* Dynamic malt additions */}
          <div>
            <label className="block mb-2 font-semibold">Malt additions</label>

            {malts.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input
                  placeholder="Malt type (e.g. Pale Ale, Munich)"
                  className="flex-1 p-3 rounded bg-black/40 border border-white/20"
                  value={m.name}
                  onChange={(e) => {
                    const updated = [...malts];
                    updated[i].name = e.target.value;
                    setMalts(updated);
                  }}
                />

                <input
                  placeholder="Amount"
                  className="w-24 p-3 rounded bg-black/40 border border-white/20"
                  value={m.amount}
                  onChange={(e) => {
                    const updated = [...malts];
                    updated[i].amount = e.target.value;
                    setMalts(updated);
                  }}
                />

                <input
                  placeholder="Unit"
                  className="w-20 p-3 rounded bg-black/40 border border-white/20"
                  value={m.unit}
                  onChange={(e) => {
                    const updated = [...malts];
                    updated[i].unit = e.target.value;
                    setMalts(updated);
                  }}
                />

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

          {/* Boil time */}
          <div>
            <label className="block mb-1 font-semibold">Boil time (minutes)</label>
            <input
              name="boil_time"
              type="number"
              step="1"
              placeholder="Example: 60"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Honey amount */}
          <div>
            <label className="block mb-1 font-semibold">Honey amount (kg)</label>
            <input
              name="honey_amount"
              type="number"
              step="0.1"
              placeholder="Example: 1.5"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Yeast */}
          <div>
            <label className="block mb-1 font-semibold">Yeast strain</label>
            <input
              name="yeast"
              placeholder="Example: US-05 or Kveik"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Additives */}
          <div>
            <label className="block mb-1 font-semibold">Additives</label>
            <textarea
              name="additives"
              placeholder="DAP, Fermaid O, K2CO3, Irish Moss..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </div>

          {/* Full process */}
          <div>
            <label className="block mb-1 font-semibold">Full process</label>
            <textarea
              name="full_process"
              placeholder="Mash schedule, honey addition, fermentation plan..."
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
