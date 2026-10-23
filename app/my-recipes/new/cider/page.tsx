"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Actions from "../../actions/createRecipe";
import MenuOverlay from "../../MenuOverlay";
import BackButton from "../../BackButton";
import FormField from "@/app/components/FormField";
import { UnitInput, UnitSymbol } from "../../../components/Units";
import RecipeAdditiveFields from "../RecipeAdditiveFields";
import RecipeSecondaryFields from "../RecipeSecondaryFields";

export default function NewCiderRecipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Cider har ingen malt/humle-warnings
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setWarnings([]);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const result = await Actions.createRecipe(formData);

    // Hvis server action sier "success: false"
    if (result?.success === false) {
      setWarnings(result.maltWarnings ?? []);
      setLoading(false);
      return;
    }

    // Redirect når alt er OK
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
        <h1 className="text-4xl font-bold mb-2 text-center">New Cider Recipe</h1>
        <p className="text-center opacity-80 mb-10">
          Fill out the details below to create a new cider recipe.
        </p>

        {/* WARNINGS (Cider får aldri warnings, men vi viser hvis server action sender noe) */}
        {warnings.length > 0 && (
          <div className="bg-red-600 text-white p-4 rounded-md mb-6">
            <strong>⚠️ Ukjente ingredienser funnet:</strong>
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
          <input type="hidden" name="type" value="Cider" />

          {/* Recipe name */}
          <FormField id="recipe-name" label="Recipe name" required>
            <input
              id="recipe-name"
              name="name"
              placeholder="Example: Hard Apple Cider"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </FormField>

          {/* Volume */}
          <FormField id="recipe-volume" label={<>Volume (<UnitSymbol kind="volume" />)</>}>
            <UnitInput
              id="recipe-volume"
              name="volume"
              kind="volume"
              placeholder="Example: 10"
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
              placeholder="Example: 1.050"
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

          {/* Juice type */}
          <FormField id="recipe-juice-type" label="Juice type">
            <input
              id="recipe-juice-type"
              name="juice_type"
              placeholder="Example: 100% apple juice, no preservatives"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* Yeast */}
          <FormField id="recipe-yeast" label="Yeast strain">
            <input
              id="recipe-yeast"
              name="yeast"
              placeholder="Example: EC-1118"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* Additives */}
          <div>
            <label className="block mb-1 font-semibold">Additives</label>
            <RecipeAdditiveFields />
          </div>
          {/* Full process */}
          <FormField id="recipe-process" label="Full process">
            <textarea
              id="recipe-process"
              name="full_process"
              placeholder="Describe fermentation, temperature, nutrient schedule..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-40"
            />
          </FormField>

          {/* Notes */}
          <FormField id="recipe-notes" label="Notes">
            <textarea
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
