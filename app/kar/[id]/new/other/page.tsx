"use client";

import { useEffect, useState } from "react";
import * as Actions from "../../actions";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import BatchEntryGuide from "@/app/components/BatchEntryGuide";
import { useRecipePrefill } from "../../../../../lib/recipes/useRecipePrefill";
import { UnitInput, UnitSymbol } from "../../../../components/Units";
import {
  BatchInventoryProvider,
  InventoryAdditiveFields,
  InventoryIngredientSelect,
} from "@/app/components/InventoryUsageFields";
import { getOtherRecipeIngredients } from "@/lib/recipes/otherRecipe";


export default function NewOtherPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { recipe?: string };
}) {
  const [loading, setLoading] = useState(false);
  const { recipe, loading: recipeLoading, error: recipeError } =
    useRecipePrefill(searchParams?.recipe, "Other");

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

  useEffect(() => {
    if (!recipe) return;
    setIngredients(
      getOtherRecipeIngredients(recipe.ingredients).map((ingredient) => ({
        name: ingredient.name,
        amount: String(ingredient.amount ?? ""),
        unit: ingredient.unit ?? "",
      }))
    );
  }, [recipe]);

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
        <h1 className="text-4xl font-bold mb-2 text-center">New Other Batch</h1>
        <p className="text-center opacity-80 mb-10">
          Use this page for experimental batches or anything that doesn&apos;t fit other categories.
        </p>

        {recipeError && <p role="alert" className="text-red-300 mb-4">{recipeError}</p>}
        <BatchEntryGuide vesselId={params.id} recipeName={recipe?.name} />
        <form
          key={recipe?.id ?? "new-batch"}
          action={Actions.createBatch}
          className="flex flex-col gap-6"
          onSubmit={() => setLoading(true)}
        >
          <BatchInventoryProvider
            recipeId={recipe?.id}
            recipe={recipe}
            className="flex flex-col gap-6"
          >
          {/* Hidden fields */}
          <input type="hidden" name="kar" value={params.id} />
          <input type="hidden" name="type" value="Other" />

          {/* Batch name */}
          <div>
            <label className="block mb-1 font-semibold">Batch name</label>
            <input
              name="name"
              defaultValue={recipe?.name ?? ""}
              placeholder="Example: Experimental Blend #1"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          {/* Volume */}
          <div>
            <label className="block mb-1 font-semibold">Volume (<UnitSymbol kind="volume" />)</label>
            <UnitInput
              name="volume_l"
              kind="volume"
              defaultValue={recipe?.volume == null ? "" : String(recipe.volume)}
              placeholder="Example: 5"
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
              defaultValue={recipe?.og ?? ""}
              type="number"
              step="0.001"
              placeholder="Example: 1.060"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          {/* Dynamic ingredients */}
          <div>
            <label className="block mb-2 font-semibold">Ingredients</label>

            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <InventoryIngredientSelect
                  selectionKey={`ingredient:${i}`}
                  placeholder="Ingredient name"
                  className="flex-1 p-3 rounded bg-black/40 border border-white/20"
                  value={ing.name}
                  onChange={(value) => {
                    const updated = [...ingredients];
                    updated[i].name = value;
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

          {/* Hidden JSON field */}
          <input type="hidden" name="ingredients_json" value={JSON.stringify(ingredients)} />

          {/* Additives */}
          <div>
            <label className="block mb-1 font-semibold">Additives</label>
            <InventoryAdditiveFields defaultValue={recipe?.additives ?? ""} />
          </div>

          {/* Full process */}
          <div>
            <label className="block mb-1 font-semibold">Full process</label>
            <textarea
              name="full_process"
              defaultValue={recipe?.full_process ?? ""}
              placeholder="Describe the full process..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-40"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block mb-1 font-semibold">Notes</label>
            <textarea
              name="notes"
              defaultValue={recipe?.notes ?? ""}
              placeholder="Any additional notes about the batch..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </div>

          {/* Submit */}
          <button
            disabled={loading || recipeLoading}
            className="w-full rounded-lg border border-green-500 bg-green-500/10 px-4 py-3 font-semibold text-green-300 transition hover:bg-green-500/20 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create batch"}
          </button>
          </BatchInventoryProvider>
        </form>
      </div>
    </main>
  );
}
