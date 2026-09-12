"use client";

import { useState } from "react";
import * as Actions from "../../actions/createRecipe";
import MenuOverlay from "../../MenuOverlay";
import BackButton from "../../BackButton";

export default function NewBeerRecipePage() {
  const [loading, setLoading] = useState(false);

  // ⭐ warnings fra server action
  const [warnings, setWarnings] = useState<string[]>([]);

  // MALTS (name + amount in kg)
  const [malts, setMalts] = useState<{ name: string; amount: string }[]>([]);

  function addMalt() {
    setMalts([...malts, { name: "", amount: "" }]);
  }

  function removeMalt(index: number) {
    const updated = [...malts];
    updated.splice(index, 1);
    setMalts(updated);
  }

  // HOPS (name + amount in g + time in min)
  const [hops, setHops] = useState<{ name: string; amount: string; time: string; alpha: string; year: string }[]>([]);
 const [dryHops, setDryHops] = useState<{ name: string; amount: string; contact: string; alpha: string; year: string }[]>([]);

function addDryHop() {
  setDryHops([...dryHops, { name: "", amount: "", contact: "", alpha: "", year: "" }]);
}

function removeDryHop(index: number) {
  const updated = [...dryHops];
  updated.splice(index, 1);
  setDryHops(updated);
}




  function addHop() {
    setHops([...hops, { name: "", amount: "", time: "", alpha: "", year: "" }]);
  }

  function removeHop(index: number) {
    const updated = [...hops];
    updated.splice(index, 1);
    setHops(updated);
  }

  // ⭐ HANDLE SUBMIT (viktig)
  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setWarnings([]); // reset warnings

  const formData = new FormData(e.currentTarget as HTMLFormElement);
  const result = await Actions.createRecipe(formData);

  // ❌ Feil maltnavn → stopp lagring
  if (result?.success === false) {
    setWarnings(result.maltWarnings ?? []);
    setLoading(false);
    return;
  }

  // ✔ Alt OK → redirect
  if (result?.success === true) {
    window.location.href = "/recipes";
    return;
  }
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
        <h1 className="text-4xl font-bold mb-2 text-center">New Beer Recipe</h1>
        <p className="text-center opacity-80 mb-10">
          Fill out the details below to create a new beer recipe.
        </p>

        {/* ⭐ WARNINGS */}
        {warnings.length > 0 && (
          <div className="bg-red-600 text-white p-4 rounded-md mb-6">
            <strong>⚠️ Unknown malts detected:</strong>
            <ul className="mt-2 list-disc list-inside">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="mt-2">Correct them or before you can save.</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          <input type="hidden" name="type" value="Beer" />

          {/* Recipe name */}
          <div>
            <label className="block mb-1 font-semibold">Recipe name</label>
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
              name="volume"
              type="text"
              placeholder="Final batch size after the boil (e.g., 20 L)"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Boil Volume */}
          <div>
            <label className="block mb-1 font-semibold">Boil Volume (L)</label>
            <input
              name="boil_volume_l"
              type="number"
              placeholder="Total wort volume before the boil"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* OG */}
          <div>
            <label className="block mb-1 font-semibold">Original Gravity (OG)</label>
            <input
              name="og"
              type="text"
              placeholder="Example: 1.050"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* FG */}
          <div>
            <label className="block mb-1 font-semibold">Final Gravity (FG)</label>
            <input
              name="fg"
              type="text"
              placeholder="Example: 1.010"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Yeast */}
          <div>
            <label className="block mb-1 font-semibold">Yeast</label>
            <input
              name="yeast"
              type="text"
              placeholder="Example: US-05"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* MALTS */}
          <div>
            <label className="block mb-2 font-semibold">Malt additions</label>

            {malts.map((m, i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full">
                <input
                  placeholder="Malt type"
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:flex-1"
                  value={m.name}
                  onChange={(e) => {
                    const updated = [...malts];
                    updated[i].name = e.target.value;
                    setMalts(updated);
                  }}
                />

                <input
                  placeholder="Amount (kg)"
                  type="text"
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-32"
                  value={m.amount}
                  onChange={(e) => {
                    const updated = [...malts];
                    updated[i].amount = e.target.value;
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

          <input type="hidden" name="malts_json" value={JSON.stringify(malts)} />

          {/* HOPS */}
          <div>
            <label className="block mb-2 font-semibold">Hop additions</label>

            {hops.map((h, i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full">
                <input
                  placeholder="Hop type"
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:flex-1"
                  value={h.name}
                  onChange={(e) => {
                    const updated = [...hops];
                    updated[i].name = e.target.value;
                    setHops(updated);
                  }}
                />

                <input
  placeholder="Alpha (%)"
  type="text"
  className="p-3 rounded bg-black/40 border border-white/20 w-24"
  value={h.alpha}
  onChange={(e) => {
    const updated = [...hops];
    updated[i].alpha = e.target.value;
    setHops(updated);
  }}
/>


<input
  placeholder="Year"
  type="text"
  className="p-3 rounded bg-black/40 border border-white/20 w-24"
  value={h.year}
  onChange={(e) => {
    const updated = [...hops];
    updated[i].year = e.target.value;
    setHops(updated);
  }}
/>

                <input
                  placeholder="Amount (g)"
                  type="text"
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-28"
                  value={h.amount}
                  onChange={(e) => {
                    const updated = [...hops];
                    updated[i].amount = e.target.value;
                    setHops(updated);
                  }}
                />

                <input
                  placeholder="Boil time (min)"
                  type="text"
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-32"
                  value={h.time}
                  onChange={(e) => {
                    const updated = [...hops];
                    updated[i].time = e.target.value;
                    setHops(updated);
                  }}
                />

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

          <input type="hidden" name="hops_json" value={JSON.stringify(hops)} />

        {/* DRY HOPS */}
<div>
  <label className="block mb-2 font-semibold">Dry hop additions</label>

  {dryHops.map((h, i) => (
    <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full">

      <input
        placeholder="Hop type"
        className="p-3 rounded bg-black/40 border border-white/20 w-full md:flex-1"
        value={h.name}
        onChange={(e) => {
          const updated = [...dryHops];
          updated[i].name = e.target.value;
          setDryHops(updated);
        }}
      />

      <input
        placeholder="Amount (g)"
        type="text"
        className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-28"
        value={h.amount}
        onChange={(e) => {
          const updated = [...dryHops];
          updated[i].amount = e.target.value;
          setDryHops(updated);
        }}
      />

      <input
        placeholder="Contact time (days)"
        type="text"
        className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-32"
        value={h.contact}
        onChange={(e) => {
          const updated = [...dryHops];
          updated[i].contact = e.target.value;
          setDryHops(updated);
        }}
      />

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




          {/* Boil time */}
          <div>
            <label className="block mb-1 font-semibold">Total boil time (minutes)</label>
            <textarea
              name="boil_time"
              placeholder="Length of the boil"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Additives */}
          <div>
            <label className="block mb-1 font-semibold">Additives</label>
            <textarea
              name="additives"
              placeholder="Irish Moss, gypsum, CaCl₂..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </div>

          {/* Full process */}
          <div>
            <label className="block mb-1 font-semibold">Full process</label>
            <textarea
              name="full_process"
              placeholder="Mash schedule, hop schedule..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-40"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block mb-1 font-semibold">Notes</label>
            <textarea
              name="notes"
              placeholder="Any additional notes..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </div>

          {/* Submit */}
          <button
            disabled={loading}
            className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            {loading ? "Saving..." : "Save recipe"}
          </button>
        </form>
      </div>
    </main>
  );
}
