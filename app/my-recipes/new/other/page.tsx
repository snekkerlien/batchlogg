"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Actions from "../../actions/createRecipe";
import MenuOverlay from "../../MenuOverlay";
import BackButton from "../../BackButton";
import FormField from "@/app/components/FormField";
import PublicMentionTextarea from "@/app/components/PublicMentionTextarea";
import { UnitInput, UnitSymbol } from "../../../components/Units";
import RecipeAdditiveFields from "../RecipeAdditiveFields";
import RecipeSecondaryFields from "../RecipeSecondaryFields";

export default function NewOtherRecipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

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
        <h1 className="text-4xl font-bold mb-2 text-center">New Other Recipe</h1>
        <p className="text-center opacity-80 mb-10">
          Use this page for experimental recipes or anything that doesn&apos;t fit other categories.
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
          aria-busy={loading}
          className="flex flex-col gap-6"
        >
          <input type="hidden" name="type" value="Other" />

          {/* Recipe name */}
          <FormField id="recipe-name" label="Recipe name" required>
            <input
              id="recipe-name"
              name="name"
              placeholder="Example: Experimental Blend #1"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </FormField>

          <div>
            <label htmlFor="other-style" className="mb-1 block font-semibold">
              Style or type (optional)
            </label>
            <input
              id="other-style"
              name="other_style"
              maxLength={80}
              placeholder="Example: Kombucha"
              className="w-full rounded border border-white/20 bg-black/40 p-3"
            />
          </div>

          {/* Volume */}
          <FormField id="recipe-volume" label={<>Volume (<UnitSymbol kind="volume" />)</>}>
            <UnitInput
              id="recipe-volume"
              name="volume"
              kind="volume"
              placeholder="Example: 5"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* OG */}
          <FormField id="recipe-og" label="Original Gravity (OG)">
            <input
              id="recipe-og"
              name="og"
              type="number"
              step="0.001"
              placeholder="Example: 1.060"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* FG */}
          <FormField id="recipe-fg" label="Final Gravity (FG)">
            <input
              id="recipe-fg"
              name="fg"
              type="number"
              step="0.001"
              placeholder="Example: 1.010"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* Dynamic ingredients */}
          <div>
            <label className="block mb-2 font-semibold">Ingredients</label>

            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input
                  aria-label={`Ingredient ${i + 1} name`}
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
                  aria-label={`Ingredient ${i + 1} amount`}
                  placeholder="Amount"
                  type="number"
                  min="0"
                  step="any"
                  className="w-24 p-3 rounded bg-black/40 border border-white/20"
                  value={ing.amount}
                  onChange={(e) => {
                    const updated = [...ingredients];
                    updated[i].amount = e.target.value;
                    setIngredients(updated);
                  }}
                />

                <input
                  aria-label={`Ingredient ${i + 1} unit`}
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
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
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
                  aria-label={`Process step ${i + 1}`}
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
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm h-fit"
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
            <RecipeAdditiveFields />
          </div>
          <FormField id="recipe-process" label="Full process">
            <PublicMentionTextarea
              id="recipe-process"
              name="full_process"
              placeholder="Describe the overall preparation and fermentation process..."
              className="h-40 w-full rounded border border-white/20 bg-black/40 p-3"
            />
          </FormField>
          {/* Notes */}
          <FormField id="recipe-notes" label="Notes">
            <PublicMentionTextarea
              id="recipe-notes"
              name="notes"
              placeholder="Any additional notes about the recipe..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </FormField>
          <RecipeSecondaryFields />

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
