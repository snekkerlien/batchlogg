"use client";

import { useState } from "react";
import * as Actions from "../../actions/createRecipe";
import MenuOverlay from "../../MenuOverlay";
import BackButton from "../../BackButton";

export default function NewMeadRecipePage() {
  const [loading, setLoading] = useState(false);

  const [warnings, setWarnings] = useState<string[]>([]);

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

  const [hadSecondary, setHadSecondary] = useState(false);
  const [secondaryAdditions, setSecondaryAdditions] = useState("");
  const [secondaryNotes, setSecondaryNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setWarnings([]);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const result = await Actions.createRecipe(formData);

    if (result?.success === false) {
      setWarnings(result.maltWarnings ?? []);
      setLoading(false);
      return;
    }

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
        <h1 className="text-4xl font-bold mb-2 text-center">New Mead Recipe</h1>
        <p className="text-center opacity-80 mb-10">
          Fill out the details below to create a new mead recipe.
        </p>

        {/* WARNINGS */}
        {warnings.length > 0 && (
          <div className="bg-red-600 text-white p-4 rounded-md mb-6">
            <strong>⚠️ Validation warnings:</strong>
            <ul className="mt-2 list-disc list-inside">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          <input type="hidden" name="type" value="Mead" />

          {/* Recipe name */}
          <div>
            <label className="block mb-1 font-semibold">Recipe name</label>
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
              name="volume"
              type="number"
              step="0.1"
              placeholder="Example: 10"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
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
            />
          </div>

          {/* FG */}
          <div>
            <label className="block mb-1 font-semibold">Final Gravity (FG)</label>
            <input
              name="fg"
              type="number"
              step="0.001"
              placeholder="Example: 1.020"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
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

          {/* Fruit additions */}
          <div>
            <label className="block mb-2 font-semibold">Fruit additions</label>

            {fruits.map((f, i) => (
              <div
                key={i}
                className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full"
              >
                <input
                  placeholder="Fruit (e.g. Mango, Raspberry)"
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:flex-1"
                  value={f.name}
                  onChange={(e) => {
                    const updated = [...fruits];
                    updated[i].name = e.target.value;
                    setFruits(updated);
                  }}
                />

                <input
                  placeholder="Amount"
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-24"
                  value={f.amount}
                  onChange={(e) => {
                    const updated = [...fruits];
                    updated[i].amount = e.target.value;
                    setFruits(updated);
                  }}
                />

                <input
                  placeholder="Unit"
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-20"
                  value={f.unit}
                  onChange={(e) => {
                    const updated = [...fruits];
                    updated[i].unit = e.target.value;
                    setFruits(updated);
                  }}
                />

                <button
                  type="button"
                  onClick={() => removeFruit(i)}
                  className="px-3 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-lg text-sm self-start md:self-auto"
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
              placeholder="Fermaid O, DAP, K2CO3..."
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
              placeholder="Any additional notes about the recipe..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </div>

          {/* Secondary fermentation toggle */}
          <div>
            <label className="block mb-2 font-semibold">Secondary fermentation</label>

            <button
              type="button"
              onClick={() => setHadSecondary(!hadSecondary)}
              className={`px-4 py-2 rounded-lg border ${
                hadSecondary
                  ? "bg-purple-700 border-purple-500"
                  : "bg-black/40 border-white/20"
              }`}
            >
              {hadSecondary ? "Secondary enabled" : "Enable secondary"}
            </button>
          </div>

          {/* Secondary fields */}
          {hadSecondary && (
            <div className="flex flex-col gap-4">

              <div>
                <label className="block mb-1 font-semibold">Secondary additions</label>
                <textarea
                  name="secondary_additions"
                  placeholder="Fruit additions, spices, oak, etc..."
                  className="w-full p-3 rounded bg-black/40 border border-white/20 h-28"
                  value={secondaryAdditions}
                  onChange={(e) => setSecondaryAdditions(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold">Secondary notes</label>
                <textarea
                  name="secondary_notes"
                  placeholder="Notes about racking, stabilization, clearing..."
                  className="w-full p-3 rounded bg-black/40 border border-white/20 h-28"
                  value={secondaryNotes}
                  onChange={(e) => setSecondaryNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <input type="hidden" name="had_secondary" value={hadSecondary ? "true" : "false"} />

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
