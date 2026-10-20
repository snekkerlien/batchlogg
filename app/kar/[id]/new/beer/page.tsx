"use client";

import { useEffect, useState } from "react";
import * as Actions from "../../actions";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import { useRecipePrefill } from "../../../../../lib/recipes/useRecipePrefill";
import { UnitInput, UnitSymbol, useUnits } from "../../../../components/Units";
import BeerStyleSelect from "@/app/components/BeerStyleSelect";
import {
  BatchInventoryProvider,
  InventoryAdditiveFields,
  InventoryIngredientSelect,
} from "@/app/components/InventoryUsageFields";


export default function NewBeerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { recipe?: string };
}) {
  const [loading, setLoading] = useState(false);
  const { label } = useUnits();
  const { recipe, loading: recipeLoading, error: recipeError } =
    useRecipePrefill(searchParams?.recipe, "Beer");

  // Dynamic malt list
  const [malts, setMalts] = useState<
    { name: string; amount: string; ebc: string }[]
  >([]);

  function addMalt() {
    setMalts([...malts, { name: "", amount: "", ebc: "" }]);
  }

  function removeMalt(index: number) {
    const updated = [...malts];
    updated.splice(index, 1);
    setMalts(updated);
  }

  // Dynamic hop list
  const [hops, setHops] = useState<
  { name: string; amount: string; time: string; alpha: string; year: string; addition_type: "boil" | "whirlpool"; temperature: string }[]
>([]);

  function addHop() {
    setHops([...hops, { name: "", amount: "", time: "", alpha: "", year: "", addition_type: "boil", temperature: "" }]);
  }

  function removeHop(index: number) {
    const updated = [...hops];
    updated.splice(index, 1);
    setHops(updated);
  }
  const [dryHops, setDryHops] = useState<
   { name: string; amount: string; contact: string; alpha: string; year: string }[]
>([]);

function addDryHop() {
  setDryHops([...dryHops, { name: "", amount: "", contact: "", alpha: "", year: "" }]);
}

function removeDryHop(index: number) {
  const updated = [...dryHops];
  updated.splice(index, 1);
  setDryHops(updated);
}

const [boilVolume, setBoilVolume] = useState("");
const [volume, setVolume] = useState("");
const [beerSubtype, setBeerSubtype] = useState("");
const [beerStyle, setBeerStyle] = useState("");

useEffect(() => {
if (!recipe) return;
const recipeIngredients =
  recipe.ingredients && !Array.isArray(recipe.ingredients)
    ? (recipe.ingredients as Record<string, unknown>)
    : null;
const storedSubtype = recipeIngredients?.beer_subtype;
setBeerStyle(
  typeof recipeIngredients?.beer_style === "string"
    ? recipeIngredients.beer_style
    : ""
);
const isKitSubtype =
  storedSubtype === "fresh_wort_kit" || storedSubtype === "malt_extract_kit";
setBeerSubtype(
  storedSubtype === "fresh_wort_kit"
    ? "fresh_wort_kit"
    : storedSubtype === "malt_extract_kit"
      ? "malt_extract_kit"
      : "all_grain"
);
setVolume(recipe.volume == null ? "" : String(recipe.volume));
  setBoilVolume(recipe.boil_volume == null ? "" : String(recipe.boil_volume));
  setMalts(
    Array.isArray(recipe.malts)
      ? recipe.malts.map((malt: any) => ({
          ...malt,
          amount: String(malt.amount ?? ""),
      ebc: String(malt.ebc ?? ""),
        }))
      : []
  );
  setHops(
    Array.isArray(recipe.hops)
      ? recipe.hops.map((hop: any) => ({
          ...hop,
          amount: String(hop.amount ?? ""),
          time: String(hop.time ?? ""),
          alpha: String(hop.alpha ?? ""),
          year: String(hop.year ?? ""),
          addition_type: hop.addition_type === "whirlpool" ? "whirlpool" : "boil",
          temperature: String(hop.temperature ?? ""),
        }))
      : []
  );
  setDryHops(
    Array.isArray(recipe.dry_hops) && recipe.dry_hops.length > 0
      ? recipe.dry_hops.map((hop: any) => ({
          ...hop,
          amount: String(hop.amount ?? ""),
          contact: String(hop.contact ?? ""),
          alpha: String(hop.alpha ?? ""),
          year: String(hop.year ?? ""),
        }))
      : isKitSubtype && Array.isArray(recipe.hops)
        ? recipe.hops.map((hop: any) => ({
            name: hop.name ?? "",
            amount: String(hop.amount ?? ""),
            contact: "",
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
        <h1 className="text-4xl font-bold mb-2 text-center">New Beer Batch</h1>
        <p className="text-center opacity-80 mb-10">
          Fill out the details below to start a new beer batch.
        </p>

        

        {recipeError && <p role="alert" className="text-red-300 mb-4">{recipeError}</p>}
        <form
          key={recipe?.id ?? "new-batch"}
          action={Actions.createBatch}
          className="w-full"
          onSubmit={() => setLoading(true)}
        >
          <BatchInventoryProvider
            recipeId={recipe?.id}
            recipe={recipe}
            className="flex flex-col gap-6"
          >
          {/* Hidden fields */}
          <input type="hidden" name="kar" value={params.id} />
          <input type="hidden" name="type" value="Beer" />

          <div>
            <label htmlFor="beer-subtype" className="mb-2 block font-semibold">
              Brewing method
            </label>
            <select
              id="beer-subtype"
              name="beer_subtype"
              value={beerSubtype}
              onChange={(event) => setBeerSubtype(event.target.value)}
              required
              className="w-full rounded-lg border border-white/20 bg-zinc-900 p-3"
            >
              <option value="">Choose a brewing method</option>
              <option value="all_grain">All-grain</option>
              <option value="fresh_wort_kit">Fresh wort kit</option>
              <option value="malt_extract_kit">Malt extract kit</option>
            </select>
          </div>

          {beerSubtype && (
            <BeerStyleSelect
              id="beer-style"
              value={beerStyle}
              onChange={setBeerStyle}
            />
          )}

          {beerSubtype && (
            <>
          {/* Batch name */}
          <div>
            <label className="mb-2 block font-semibold">
              {beerSubtype === "all_grain" ? "Batch name" : "Batch / kit name"}
            </label>
            <input
              name="name"
              defaultValue={recipe?.name ?? ""}
              placeholder="Example: Pale Ale, IPA, Stout"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          {beerSubtype !== "all_grain" && (
            <div>
              <label className="mb-2 block font-semibold">Kit link (optional)</label>
              <input
                name="kit_url"
                type="url"
                defaultValue={
                  recipe?.ingredients && !Array.isArray(recipe.ingredients)
                    ? String((recipe.ingredients as Record<string, unknown>).kit_url ?? "")
                    : ""
                }
                placeholder="https://example.com/kit"
                className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
              />
            </div>
          )}

          {/* Volume */}
          <div>
            <label className="mb-2 block font-semibold">Volume (<UnitSymbol kind="volume" />)</label>
            <UnitInput
              name="volume_l"
              kind="volume"
              placeholder="Final batch volume"
              value={volume}
              onValueChange={setVolume}
              required
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />

          </div>

          {beerSubtype === "all_grain" && (
          <div>
            <label className="mb-2 block font-semibold">Boil Volume (<UnitSymbol kind="volume" />)</label>
            <UnitInput
              name="boil_volume_l"
              kind="volume"
              placeholder="Volume before boil"
              value={boilVolume}
              onValueChange={setBoilVolume}
              required
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>
          )}


          {/* Start date */}
          <div>
            <label className="mb-2 block font-semibold">Start date</label>
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
            <label className="mb-2 block font-semibold">Original Gravity (OG)</label>
            <input
              name="og"
              defaultValue={recipe?.og ?? ""}
              type="number"
              step="0.001"
              placeholder="Example: 1.050"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </div>

          {beerSubtype === "fresh_wort_kit" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block font-semibold">
                IBU (from kit)
                <input
                  name="ibu"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={
                    recipe?.ingredients &&
                    !Array.isArray(recipe.ingredients) &&
                    (recipe.ingredients as Record<string, unknown>).beer_subtype === "fresh_wort_kit"
                      ? String(recipe.ibu ?? "")
                      : ""
                  }
                  required
                  className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3 font-normal"
                />
              </label>
              <label className="block font-semibold">
                EBC (from kit)
                <input
                  name="ebc"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={
                    recipe?.ingredients &&
                    !Array.isArray(recipe.ingredients) &&
                    (recipe.ingredients as Record<string, unknown>).beer_subtype === "fresh_wort_kit"
                      ? String(recipe.ebc ?? "")
                      : ""
                  }
                  required
                  className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3 font-normal"
                />
              </label>
            </div>
          )}

          {beerSubtype === "all_grain" && (
          <div>
  <label className="block mb-2 font-semibold">Malt additions</label>

  {malts.map((m, i) => (
  <div
    key={i}
    className="flex flex-col md:flex-row md:flex-wrap md:items-start gap-2 mb-2 w-full"
  >
    {/* Malt type */}
    <InventoryIngredientSelect
      selectionKey={`malt:${i}`}
      placeholder="Malt type"
      category="malts"
      className="p-3 rounded bg-black/40 border border-white/20 flex-1 min-w-[240px]"
      value={m.name}
      onChange={(value) => {
        const updated = [...malts];
        updated[i].name = value;
        setMalts(updated);
      }}
      onItemSelect={(item) => {
        if (!item) return;
        setMalts((current) =>
          current.map((malt, index) =>
            index === i
              ? { ...malt, ebc: item.ebc != null ? String(item.ebc) : malt.ebc }
              : malt
          )
        );
      }}
    />

    {/* Amount */}
    <UnitInput
      kind="kg"
      placeholder={`Amount (${label("kg")})`}
      className="p-3 rounded bg-black/40 border border-white/20 w-32"
      value={m.amount}
      onValueChange={(value) => {
        const updated = [...malts];
        updated[i].amount = value;
        setMalts(updated);
      }}
    />

    <input
      type="number"
      min="0"
      step="any"
      placeholder="EBC"
      aria-label={`Malt ${i + 1} EBC`}
      required
      className="w-24 rounded-lg border border-white/20 bg-black/40 p-3"
      value={m.ebc}
      onChange={(event) => {
        const updated = [...malts];
        updated[i].ebc = event.target.value;
        setMalts(updated);
      }}
    />

    {/* Remove */}
    <button
      type="button"
      onClick={() => removeMalt(i)}
      className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
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
)}

{/* Hidden JSON field */}
<input
  type="hidden"
  name="malts_json"
  value={JSON.stringify(beerSubtype === "all_grain" ? malts : [])}
/>

          {/* Dynamic hop additions */}
          {beerSubtype === "all_grain" && (
          <div>
  <label className="block mb-2 font-semibold">Hop additions</label>

  {hops.map((h, i) => (
  <div
    key={i}
    className="w-full mb-4 space-y-2"
  >
    {/* Hop type */}
    <InventoryIngredientSelect
      selectionKey={`hop:${i}`}
      placeholder="Hop type"
      category="hops"
      className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
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

<select
  aria-label={`Hop ${i + 1} addition type`}
  value={h.addition_type}
  onChange={(event) => {
    const updated = [...hops];
    updated[i].addition_type = event.target.value as "boil" | "whirlpool";
    setHops(updated);
  }}
  className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
>
  <option value="boil">Boil addition</option>
  <option value="whirlpool">Whirlpool / hop stand</option>
</select>

<div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(6.5rem,0.8fr)_minmax(5rem,0.6fr)_minmax(7rem,1fr)_minmax(9rem,1.4fr)_auto]">

    <input
  placeholder="Alpha (%)"
      type="number"
      min="0.1"
      max="100"
      step="any"
      required
  className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
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
  className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
  value={h.year}
  onChange={(e) => {
    const updated = [...hops];
    updated[i].year = e.target.value;
    setHops(updated);
  }}
/>


    {/* Amount */}
    <UnitInput
      kind="g"
      placeholder={`Amount (${label("g")})`}
      className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
      value={h.amount}
      onValueChange={(value) => {
        const updated = [...hops];
        updated[i].amount = value;
        setHops(updated);
      }}
    />

    {/* Boil time */}
    <input
      placeholder={h.addition_type === "whirlpool" ? "Stand time (min)" : "Boil time (min)"}
      type="text"
      required={Boolean(h.name || h.amount || h.alpha)}
      className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
      value={h.time}
      onChange={(e) => {
        const updated = [...hops];
        updated[i].time = e.target.value;
        setHops(updated);
      }}
    />

    {h.addition_type === "whirlpool" && (
      <input
        aria-label={`Hop ${i + 1} whirlpool temperature in Celsius`}
        placeholder="Temperature (°C)"
        type="number"
        min="0"
        max="100"
        step="any"
        required={Boolean(h.name || h.amount || h.alpha)}
        className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
        value={h.temperature}
        onChange={(e) => {
          const updated = [...hops];
          updated[i].temperature = e.target.value;
          setHops(updated);
        }}
      />
    )}

    {/* Remove */}
    <button
      type="button"
      onClick={() => removeHop(i)}
      className="col-span-2 justify-self-end rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm hover:bg-white/20 sm:col-span-1 sm:justify-self-auto"
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
)}

{/* Dry hop additions */}
{beerSubtype && (
<div>
  <label className="mb-2 block font-semibold">
    Dry hop additions
  </label>

  {dryHops.map((h, i) => (
    <div
      key={i}
      className="w-full mb-4 space-y-2"
    >
      {/* Hop type */}
      <InventoryIngredientSelect
        selectionKey={`dryhop:${i}`}
        placeholder="Hop type"
        category="hops"
        className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
        value={h.name}
        onChange={(value) => {
          const updated = [...dryHops];
          updated[i].name = value;
          setDryHops(updated);
        }}
        onItemSelect={(item) => {
          if (!item) return;
          setDryHops((current) =>
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

<div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(6.5rem,0.8fr)_minmax(5rem,0.6fr)_minmax(7rem,1fr)_minmax(9rem,1.4fr)_auto]">

      {/* Alpha (%) */}
      <input
        placeholder="Alpha (%)"
        type="number"
        min="0.1"
        max="100"
        step="any"
        required
        className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
        value={h.alpha}
        onChange={(e) => {
          const updated = [...dryHops];
          updated[i].alpha = e.target.value;
          setDryHops(updated);
        }}
      />

      {/* Year */}
      <input
        placeholder="Year"
        type="text"
        className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
        value={h.year}
        onChange={(e) => {
          const updated = [...dryHops];
          updated[i].year = e.target.value;
          setDryHops(updated);
        }}
      />

      {/* Amount */}
      <UnitInput
        kind="g"
        placeholder={`Amount (${label("g")})`}
        className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
        value={h.amount}
        onValueChange={(value) => {
          const updated = [...dryHops];
          updated[i].amount = value;
          setDryHops(updated);
        }}
      />

      {/* Contact time */}
      <input
        placeholder="Contact time (days)"
        type="text"
        className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
        value={h.contact}
        onChange={(e) => {
          const updated = [...dryHops];
          updated[i].contact = e.target.value;
          setDryHops(updated);
        }}
      />

      {/* Remove */}
      <button
        type="button"
        onClick={() => removeDryHop(i)}
        className="col-span-2 justify-self-end rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm hover:bg-white/20 sm:col-span-1 sm:justify-self-auto"
      >
        Remove
      </button>
</div>
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
)}

<input
  type="hidden"
  name="dry_hops_json"
  value={JSON.stringify(beerSubtype ? dryHops : [])}
/>





          {/* Hidden JSON field */}
          <input
            type="hidden"
            name="hops_json"
            value={JSON.stringify(
              beerSubtype === "all_grain" ? hops : []
            )}
          />

          {/* Boil time */}
          {beerSubtype === "all_grain" && (
          <div>
            <label className="mb-2 block font-semibold">Total boil time (minutes)</label>
            <input
              name="boil_time"
              defaultValue={recipe?.boil_time ?? ""}
              type="number"
              step="1"
              placeholder="Example: 60"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>
          )}

          {/* Yeast */}
          <div>
            <label className="mb-2 block font-semibold">Yeast strain</label>
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
            <label className="mb-2 block font-semibold">Additives</label>
            <InventoryAdditiveFields defaultValue={recipe?.additives ?? ""} />
          </div>

          {/* Full process */}
          <div>
            <label className="mb-2 block font-semibold">Full process</label>
            <textarea
              name="full_process"
              defaultValue={recipe?.full_process ?? ""}
              placeholder="Mash schedule, hop schedule, fermentation plan..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-40"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block font-semibold">Notes</label>
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
            </>
          )}
          </BatchInventoryProvider>
          
        </form>
      </div>
    </main>
  );
}
