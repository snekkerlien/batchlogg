"use client";

import { useEffect, useState } from "react";
import * as Actions from "../../actions";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import { useRecipePrefill } from "../../../../../lib/recipes/useRecipePrefill";
import { UnitInput, UnitSymbol } from "../../../../components/Units";
import BaseLiquidField from "../../../../components/BaseLiquidField";
import {
  BatchInventoryProvider,
  InventoryAdditiveFields,
  InventoryPreferenceFallback,
  InventoryIngredientSelect,
} from "@/app/components/InventoryUsageFields";

export default function NewMeadPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { recipe?: string };
}) {
  const [loading, setLoading] = useState(false);
  const { recipe, loading: recipeLoading, error: recipeError } =
    useRecipePrefill(searchParams?.recipe, "Mead");
  const [honeyType, setHoneyType] = useState(recipe?.honey_type ?? "");

  useEffect(() => {
    if (recipe?.honey_type) setHoneyType(recipe.honey_type);
  }, [recipe?.honey_type]);

  // Dynamic fruit list
  const [fruits, setFruits] = useState<
    { name: string; amount: string; unit: string }[]
  >([]);

  useEffect(() => {
    if (recipe) setFruits(Array.isArray(recipe.fruits) ? recipe.fruits : []);
  }, [recipe]);
  useEffect(() => {
    if (recipe) setHoneyType(recipe.honey_type ?? "");
  }, [recipe]);

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

        {recipeError && <p role="alert" className="text-red-300 mb-4">{recipeError}</p>}
        <form
          key={recipe?.id ?? "new-batch"}
          action={Actions.createBatch}
          className="flex flex-col gap-6"
          onSubmit={() => setLoading(true)}
        >
          <BatchInventoryProvider recipeId={recipe?.id} recipe={recipe}>
          {/* Hidden fields */}
          <input type="hidden" name="kar" value={params.id} />
          <input type="hidden" name="type" value="Mead" />

          {/* Batch name */}
          <div>
            <label className="block mb-1 font-semibold">Batch name</label>
            <input
              name="name"
              defaultValue={recipe?.name ?? ""}
              placeholder="Example: Mango Melomel"
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
              defaultValue={recipe?.og ?? ""}
              type="number"
              step="0.001"
              placeholder="Example: 1.110"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          <BaseLiquidField defaultName={recipe?.base_liquid ?? ""} defaultAmount={recipe?.base_liquid_amount == null ? "" : String(recipe.base_liquid_amount)} />

          {/* Honey */}
          <div>
            <label className="block mb-1 font-semibold">Honey type</label>
            <input type="hidden" name="honey_type" value={honeyType} />
            <InventoryIngredientSelect
              selectionKey="honey"
              trackAmount
              amountFieldName="inventory_honey_amount"
              defaultAmount={recipe?.honey_amount == null ? "" : String(recipe.honey_amount)}
              defaultAmountUnit="kg"
              value={honeyType}
              onChange={setHoneyType}
              placeholder="Honey type"
              category="fermentables"
              subcategory="Honey"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          <InventoryPreferenceFallback>
            <div>
              <label className="block mb-1 font-semibold">Honey amount (<UnitSymbol kind="kg" />)</label>
              <UnitInput
                name="honey_amount"
                kind="kg"
                defaultValue={recipe?.honey_amount == null ? "" : String(recipe.honey_amount)}
                placeholder="Example: 3.5"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />
            </div>
          </InventoryPreferenceFallback>

          {/* Dynamic fruit additions */}
          <div>
  <label className="block mb-2 font-semibold">Fruit additions</label>

  {fruits.map((f, i) => (
    <div
      key={i}
      className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(6rem,0.35fr)_minmax(5rem,0.25fr)_auto]"
    >
      <InventoryIngredientSelect
        selectionKey={`fruit:${i}`}
        placeholder="Fruit"
        category="flavorings"
        subcategory="Fruit"
        className="col-span-2 min-w-0 rounded border border-white/20 bg-black/40 p-3 sm:col-span-1"
        value={f.name}
        onChange={(value) => {
          const updated = [...fruits];
          updated[i].name = value;
          setFruits(updated);
        }}
        onItemSelect={(item) => {
          if (!item) return;
          setFruits((current) =>
            current.map((fruit, index) =>
              index === i ? { ...fruit, unit: item.unit } : fruit
            )
          );
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
            <InventoryIngredientSelect
              name="yeast"
              selectionKey="yeast"
              trackAmount
              defaultValue={recipe?.yeast ?? ""}
              placeholder="Yeast strain"
              category="yeast"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

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
              placeholder="Rehydration, pitching, degassing schedule, fermentation notes..."
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
            className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            {loading ? "Creating..." : "Create batch"}
          </button>
          </BatchInventoryProvider>
        </form>
      </div>
    </main>
  );
}
