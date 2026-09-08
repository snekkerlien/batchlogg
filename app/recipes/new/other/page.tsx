"use client";

import { useState } from "react";
import * as Actions from "../../actions/createRecipe";
import MenuOverlay from "../../MenuOverlay";
import BackButton from "../../BackButton";

export default function NewOtherRecipePage() {
  const [loading, setLoading] = useState(false);

  // Dynamic ingredient list
  const [ingredients, setIngredients] = useState<
    { name: string; amount: string; unit: string }[]
  >([]);

  function addIngredient() {
    setIngredients([...ingredients, { name: "", amount: "", unit: "" }]);
  }

  function removeIngredient(index: number) {
    const updated = [...ingredients];
    updated.splice(index, 1);
    setIngredients(updated);
  }

  // Dynamic process steps
  const [steps, setSteps] = useState<string[]>([]);

  function addStep() {
    setSteps([...steps, ""]);
  }

  function removeStep(index: number) {
    const updated = [...steps];
    updated.splice(index, 1);
    setSteps(updated);
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
        <h1 className="text-4xl font-bold mb-2 text-center">New Other Recipe</h1>
        <p className="text-center opacity-80 mb-10">
          Use this page for experimental recipes or anything that doesn't fit other categories.
        </p>

        <form
          action={Actions.createRecipe}
          className="flex flex-col gap-6"
          onSubmit={() => setLoading(true)}
        >
          {/* Hidden fields */}
          <input type="hidden" name="type" value="Other" />

          {/* Recipe name */}
          <div>
            <label className="block mb-1 font-semibold">Recipe name</label>
            <input
              name="name"
              placeholder="Example: Experimental Blend #1"
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
              placeholder="Example: 5"
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
              placeholder="Example: 1.060"
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
              placeholder="Example: 1.010"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Dynamic ingredients */}
          <div>
            <label className="block mb-2 font-semibold">Ingredients</label>

            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input
                  placeholder="Ingredient name"
                  className="flex-1 p-3 rounded bg-black/40 border border-white/20"
                  value={ing.name}
                  onChange={(e) => {
                    const updated = [...ingredients];
                    updated[i].name = e.target.value;
                    setIngredients(updated);
                  }}
                />

                <input
                  placeholder="Amount"
                  className="w-24 p-3 rounded bg-black/40 border border-white/20"
                  value={ing.amount}
                  onChange={(e) => {
                    const updated = [...ingredients];
                    updated[i].amount = e.target.value;
                    setIngredients(updated);
                  }}
                />

                <input
                  placeholder="Unit"
                  className="w-20 p-3 rounded bg-black/40 border border-white/20"
                  value={ing.unit}
                  onChange={(e) => {
                    const updated = [...ingredients];
                    updated[i].unit = e.target.value;
                    setIngredients(updated);
                  }}
                />

                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="px-3 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-lg text-sm"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addIngredient}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
            >
              + Add ingredient
            </button>
          </div>

          <input type="hidden" name="ingredients_json" value={JSON.stringify(ingredients)} />

          {/* Dynamic process steps */}
          <div>
            <label className="block mb-2 font-semibold">Process steps</label>

            {steps.map((step, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <textarea
                  placeholder={`Step ${i + 1}`}
                  className="flex-1 p-3 rounded bg-black/40 border border-white/20 h-24"
                  value={step}
                  onChange={(e) => {
                    const updated = [...steps];
                    updated[i] = e.target.value;
                    setSteps(updated);
                  }}
                />

                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="px-3 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-lg text-sm h-fit"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addStep}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
            >
              + Add step
            </button>
          </div>

          <input type="hidden" name="steps_json" value={JSON.stringify(steps)} />

          {/* Additives */}
          <div>
            <label className="block mb-1 font-semibold">Additives</label>
            <textarea
              name="additives"
              placeholder="Optional additives, chemicals, nutrients..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
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
