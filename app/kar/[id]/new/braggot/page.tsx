"use client";

import { useEffect, useState } from "react";
import * as Actions from "../../actions";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import { useRecipePrefill } from "../../../../../lib/recipes/useRecipePrefill";
import { UnitInput, UnitSymbol, useUnits } from "../../../../components/Units";
import {
  BatchInventoryProvider,
  InventoryAdditiveFields,
  InventoryIngredientSelect,
} from "@/app/components/InventoryUsageFields";

export default function NewBraggotPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { recipe?: string };
}) {
  const [loading, setLoading] = useState(false);
  const { label } = useUnits();
  const { recipe, loading: recipeLoading, error: recipeError } =
    useRecipePrefill(searchParams?.recipe, "Braggot");

  // Dynamic malt list
  const [malts, setMalts] = useState<
    { name: string; amount: string; unit: string }[]
  >([]);

  function addMalt() {
    setMalts([...malts, { name: "", amount: "", unit: "kg" }]);
  }

  function removeMalt(index: number) {
    const updated = [...malts];
    updated.splice(index, 1);
    setMalts(updated);
  }

  // Dynamic hop list
const [hops, setHops] = useState<
  { name: string; amount: string; unit: string; boil: string; alpha: string; year: string }[]
>([]);

function addHop() {
  setHops([...hops, { name: "", amount: "", unit: "g", boil: "", alpha: "", year: "" }]);
}

function removeHop(index: number) {
  const updated = [...hops];
  updated.splice(index, 1);
  setHops(updated);
}

useEffect(() => {
  if (!recipe) return;
  setMalts(
    Array.isArray(recipe.malts)
      ? recipe.malts.map((malt: any) => ({
          name: malt.name ?? "",
          amount: String(malt.amount ?? ""),
          unit: "kg",
        }))
      : []
  );
  setHops(
    Array.isArray(recipe.hops)
      ? recipe.hops.map((hop: any) => ({
          name: hop.name ?? "",
          amount: String(hop.amount ?? ""),
          unit: "g",
          boil: String(hop.time ?? hop.boil ?? ""),
          alpha: String(hop.alpha ?? ""),
          year: String(hop.year ?? ""),
        }))
      : []
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
        <h1 className="text-4xl font-bold mb-2 text-center">New Braggot Batch</h1>
        <p className="text-center opacity-80 mb-10">
          Fill out the details below to start a new braggot batch.
        </p>

        {recipeError && <p role="alert" className="text-red-300 mb-4">{recipeError}</p>}
        <form
          key={recipe?.id ?? "new-batch"}
          action={Actions.createBatch}
          className="flex flex-col gap-6"
          onSubmit={() => setLoading(true)}
        >
          <BatchInventoryProvider>
          {/* Hidden fields */}
          <input type="hidden" name="kar" value={params.id} />
          <input type="hidden" name="type" value="Braggot" />

          {/* Batch name */}
          <div>
            <label className="block mb-1 font-semibold">Batch name</label>
            <input
              name="name"
              defaultValue={recipe?.name ?? ""}
              placeholder="Example: Honey Ale Braggot"
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
              placeholder="Example: 1.070"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          {/* Dynamic malt additions */}
          <div>
  <label className="block mb-2 font-semibold">Malt additions</label>

  {malts.map((m, i) => (
    <div
      key={i}
      className="flex flex-col md:flex-row md:flex-wrap md:items-start gap-2 mb-2 w-full"
    >
      <InventoryIngredientSelect
        selectionKey={`malt:${i}`}
        placeholder="Malt type (e.g. Pale Ale, Munich)"
        category="malts"
        className="p-3 rounded bg-black/40 border border-white/20 w-full"
        value={m.name}
        onChange={(value) => {
          const updated = [...malts];
          updated[i].name = value;
          setMalts(updated);
        }}
      />

      <UnitInput
        kind="kg"
        placeholder={`Amount (${label("kg")})`}
        className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-24"
        value={m.amount}
        onValueChange={(value) => {
          const updated = [...malts];
          updated[i].amount = value;
          updated[i].unit = "kg";
          setMalts(updated);
        }}
      />

      <button
        type="button"
        onClick={() => removeMalt(i)}
        className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm self-start md:self-auto"
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

{/* Hop additions */}
<div>
  <label className="block mb-2 font-semibold">Hop additions</label>

  {hops.map((h, i) => (
    <div
      key={i}
      className="w-full mb-4 space-y-2"
    >
      <InventoryIngredientSelect
        selectionKey={`hop:${i}`}
        placeholder="Hop type (e.g. Citra, Mosaic)"
        category="hops"
        className="p-3 rounded bg-black/40 border border-white/20 w-full"
        value={h.name}
        onChange={(value) => {
          const updated = [...hops];
          updated[i].name = value;
          setHops(updated);
        }}
        onItemSelect={(item) => {
          if (!item) return;
          setHops((current) =>
            current.map((hop, index) =>
              index === i
                ? {
                    ...hop,
                    alpha: item.alpha_acid != null ? String(item.alpha_acid) : hop.alpha,
                    year: item.hop_year != null ? String(item.hop_year) : hop.year,
                  }
                : hop
            )
          );
        }}
      />

<div className="grid grid-cols-2 gap-2 sm:grid-cols-[5rem_5rem_minmax(0,1fr)_minmax(0,1.4fr)_auto]">

      <input
        placeholder="Alpha (%)"
        className="p-3 rounded bg-black/40 border border-white/20 w-full"
        value={h.alpha}
        onChange={(e) => {
          const updated = [...hops];
          updated[i].alpha = e.target.value;
          setHops(updated);
        }}
      />

      <input
        placeholder="Year"
        className="p-3 rounded bg-black/40 border border-white/20 w-full"
        value={h.year}
        onChange={(e) => {
          const updated = [...hops];
          updated[i].year = e.target.value;
          setHops(updated);
        }}
      />

      <UnitInput
        kind="g"
        placeholder={`Amount (${label("g")})`}
        className="p-3 rounded bg-black/40 border border-white/20 w-full"
        value={h.amount}
        onValueChange={(value) => {
          const updated = [...hops];
          updated[i].amount = value;
          updated[i].unit = "g";
          setHops(updated);
        }}
      />

      <input
        placeholder="Boil (min)"
        className="p-3 rounded bg-black/40 border border-white/20 w-full"
        value={h.boil}
        onChange={(e) => {
          const updated = [...hops];
          updated[i].boil = e.target.value;
          setHops(updated);
        }}
      />

      <button
        type="button"
        onClick={() => removeHop(i)}
        className="col-span-2 sm:col-span-1 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
      >
        Remove
      </button>
</div>
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

{/* Hidden JSON field */}
<input type="hidden" name="hops_json" value={JSON.stringify(hops.map((hop) => ({ ...hop, time: hop.boil })))} />



          {/* Hidden JSON field */}
          <input type="hidden" name="malts_json" value={JSON.stringify(malts)} />

          {/* Boil time */}
          <div>
            <label className="block mb-1 font-semibold">Boil time (minutes)</label>
            <input
              name="boil_time"
              defaultValue={recipe?.boil_time ?? ""}
              type="number"
              step="1"
              placeholder="Example: 60"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          {/* Honey amount */}
          <div>
            <label className="block mb-1 font-semibold">Honey type</label>
            <InventoryIngredientSelect
              name="honey_type"
              selectionKey="honey"
              defaultValue={recipe?.honey_type ?? ""}
              placeholder="Honey type"
              category="fermentables"
              subcategory="Honey"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
            <label className="block mb-1 font-semibold">Honey amount (<UnitSymbol kind="kg" />)</label>
            <UnitInput
              name="honey_amount"
              kind="kg"
              defaultValue={recipe?.honey_amount == null ? "" : String(recipe.honey_amount)}
              placeholder="Example: 1.5"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

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
              placeholder="Mash schedule, honey addition, fermentation plan..."
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
