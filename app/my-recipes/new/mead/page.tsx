"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Actions from "../../actions/createRecipe";
import MenuOverlay from "../../MenuOverlay";
import BackButton from "../../BackButton";
import { UnitInput, UnitSymbol } from "../../../components/Units";
import BaseLiquidField from "../../../components/BaseLiquidField";
import RecipeAdditiveFields from "../RecipeAdditiveFields";

export default function NewMeadRecipePage() {
  const router = useRouter();
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
      router.push("/my-recipes");
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
            <label className="block mb-1 font-semibold">Volume (<UnitSymbol kind="volume" />)</label>
            <UnitInput
              name="volume"
              kind="volume"
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

          <BaseLiquidField />

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
            <label className="block mb-1 font-semibold">Honey amount (<UnitSymbol kind="kg" />)</label>
            <UnitInput
              name="honey_amount"
              kind="kg"
              placeholder="Example: 3.5"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Fruit additions */}
<div>
  <label className="block mb-2 font-semibold">Fruit additions</label>

  <div className="space-y-2">
    {fruits.map((f, i) => (
      <div
        key={i}
        className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(6rem,0.35fr)_minmax(5rem,0.25fr)_auto]"
      >
        <input
          aria-label={`Fruit ${i + 1}`}
          placeholder="Fruit (e.g. Mango, Raspberry)"
          className="col-span-2 min-w-0 rounded border border-white/20 bg-black/40 p-3 sm:col-span-1"
          value={f.name}
          onChange={(e) => {
            const updated = [...fruits];
            updated[i].name = e.target.value;
            setFruits(updated);
          }}
        />

        <input
          aria-label={`Fruit ${i + 1} amount`}
          placeholder="Amount"
          type="number"
          min="0"
          step="any"
          className="min-w-0 rounded border border-white/20 bg-black/40 p-3"
          value={f.amount}
          onChange={(e) => {
            const updated = [...fruits];
            updated[i].amount = e.target.value;
            setFruits(updated);
          }}
        />

        <input
          aria-label={`Fruit ${i + 1} unit`}
          placeholder="Unit"
          className="min-w-0 rounded border border-white/20 bg-black/40 p-3"
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
          className="col-span-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 sm:col-span-1"
        >
          Remove
        </button>
      </div>
    ))}

    <button
      type="button"
      onClick={addFruit}
      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
    >
      + Add fruit
    </button>
  </div>
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
            <RecipeAdditiveFields />
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
