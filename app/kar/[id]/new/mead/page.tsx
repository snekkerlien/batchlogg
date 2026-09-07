"use client";

import { useState } from "react";
import * as Actions from "../../actions";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";

export default function NewMeadPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false);

  // Dynamic fruit list
  const [fruits, setFruits] = useState<
    { name: string; amount: string; unit: string }[]
  >([]);

  function addFruit() {
    setFruits([...fruits, { name: "", amount: "", unit: "" }]);
  }

  function removeFruit(index: number) {
    const updated = [...fruits];
    updated.splice(index, 1);
    setFruits(updated);
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
        <h1 className="text-4xl font-bold mb-2 text-center">New Mead Batch</h1>
        <p className="text-center opacity-80 mb-10">
          Fill out the details below to start a new mead batch.
        </p>

        <form
          action={Actions.createBatch}
          className="flex flex-col gap-6"
          onSubmit={() => setLoading(true)}
        >
          {/* Hidden fields */}
          <input type="hidden" name="kar" value={params.id} />
          <input type="hidden" name="type" value="Mead" />

          {/* Batch name */}
          <div>
            <label className="block mb-1 font-semibold">Batch name</label>
            <input
              name="name"
              placeholder="Example: Mango Melomel"
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
              placeholder="Example: 1.110"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          {/* Honey */}
          <div>
            <label className="block mb-1 font-semibold">Honey type</label>
            <input
              name="honey_type"
              placeholder="Example: Wildflower honey"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Honey amount (kg)</label>
            <input
              name="honey_amount"
              type="number"
              step="0.1"
              placeholder="Example: 3.5"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Dynamic fruit additions */}
          <div>
            <label className="block mb-2 font-semibold">Fruit additions</label>

            {fruits.map((f, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input
                  placeholder="Fruit"
                  className="flex-1 p-3 rounded bg-black/40 border border-white/20"
                  value={f.name}
                  onChange={(e) => {
                    const updated = [...fruits];
                    updated[i].name = e.target.value;
                    setFruits(updated);
                  }}
                />
                <input
                  placeholder="Amount"
                  className="w-24 p-3 rounded bg-black/40 border border-white/20"
                  value={f.amount}
                  onChange={(e) => {
                    const updated = [...fruits];
                    updated[i].amount = e.target.value;
                    setFruits(updated);
                  }}
                />
                <input
                  placeholder="Unit"
                  className="w-20 p-3 rounded bg-black/40 border border-white/20"
                  value={f.unit}
                  onChange={(e) => {
                    const updated = [...fruits];
                    updated[i].unit = e.target.value;
                    setFruits(updated);
                  }}
                />

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeFruit(i)}
                  className="px-3 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-lg text-sm"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addFruit}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
            >
              + Add fruit
            </button>
          </div>

          {/* Hidden JSON fields */}
          <input type="hidden" name="fruits_json" value={JSON.stringify(fruits)} />

          {/* Yeast */}
          <div>
            <label className="block mb-1 font-semibold">Yeast strain</label>
            <input
              name="yeast"
              placeholder="Example: Lalvin 71B"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Additives */}
          <div>
            <label className="block mb-1 font-semibold">Additives</label>
            <textarea
              name="additives"
              placeholder="Water to 10L, 3g Fermaid O, 1g DAP, 1g K2CO3..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </div>

          {/* Full process */}
          <div>
            <label className="block mb-1 font-semibold">Full process</label>
            <textarea
              name="full_process"
              placeholder="Rehydration, pitching, degassing schedule, fermentation notes..."
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
