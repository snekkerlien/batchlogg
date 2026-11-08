"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitRecipe } from "../submitRecipe";
import MenuOverlay from "../../MenuOverlay";
import BackButton from "../../BackButton";
import FormField from "@/app/components/FormField";
import PublicMentionTextarea from "@/app/components/PublicMentionTextarea";
import { UnitInput, UnitSymbol, useUnits } from "../../../components/Units";
import RecipeAdditiveFields from "../RecipeAdditiveFields";
import RecipeSecondaryFields from "../RecipeSecondaryFields";
import { useTranslation } from "@/lib/i18n/useTranslation";
import RecipeCreationError from "../RecipeCreationError";

export default function NewBraggotRecipePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { label } = useUnits();

  // Dynamic malt list
  const [malts, setMalts] = useState<
    { name: string; amount: string; unit: string; ebc: string }[]
  >([]);

  function addMalt() {
    setMalts([...malts, { name: "", amount: "", unit: "kg", ebc: "" }]);
  }

  function removeMalt(index: number) {
    const updated = [...malts];
    updated.splice(index, 1);
    setMalts(updated);
  }

  // Dynamic hop list
  const [hops, setHops] = useState<
  {
    name: string;
    amount: string;
    time: string;
    alpha: string;
    year: string;
    addition_type: "boil" | "whirlpool";
    temperature: string;
  }[]
  >([]);

  
    function addHop() {
  setHops([
    ...hops,
    {
      name: "",
      amount: "",
      time: "",
      alpha: "",
      year: "",
      addition_type: "boil",
      temperature: "",
    },
  ]);
}


  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setWarnings([]);
  setError("");

  const formData = new FormData(e.currentTarget as HTMLFormElement);
  const result = await submitRecipe(formData);

  if (result?.success === false) {
    setWarnings(result.maltWarnings ?? []);
    setError(result.error ?? (result.maltWarnings?.length ? "" : "Could not save the recipe."));
    setLoading(false);
    return;
  }

  if (result?.success === true) {
    router.push("/my-recipes");
    return;
  }
}


  function removeHop(index: number) {
    const updated = [...hops];
    updated.splice(index, 1);
    setHops(updated);
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
        <h1 className="text-4xl font-bold mb-2 text-center">{t("New Braggot Recipe")}</h1>
        <p className="text-center opacity-80 mb-10">
          {t("Fill out the details below to create a new braggot recipe.")}
        </p>

        <RecipeCreationError error={error} />
        {warnings.length > 0 && (
  <div className="bg-red-600 text-white p-4 rounded-md mb-6">
    <strong>{t("⚠️ Malt EBC is missing:")}</strong>
    <ul className="mt-2 list-disc list-inside">
      {warnings.map((w) => (
        <li key={w}>{w}</li>
      ))}
    </ul>
    <p className="mt-2">{t("Enter the EBC value for each malt before saving.")}</p>
  </div>
)}


        <form
          onSubmit={handleSubmit}
          aria-busy={loading}
          className="flex flex-col gap-6"
        >
          {/* Hidden fields */}
          <input type="hidden" name="type" value="Braggot" />

          {/* Recipe name */}
          <FormField id="recipe-name" label={t("Recipe name")} required>
            <input
              id="recipe-name"
              name="name"
              placeholder={t("Example: Honey Ale Braggot")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </FormField>

          {/* Volume */}
          <FormField id="recipe-volume" label={<>{t("Volume")} (<UnitSymbol kind="volume" />)</>}>
            <UnitInput
              id="recipe-volume"
              name="volume"
              kind="volume"
              placeholder={t("Example: 10")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* OG */}
          <FormField id="recipe-og" label={t("Original Gravity (OG)")}>
            <input
              id="recipe-og"
              name="og"
              type="number"
              step="0.001"
              placeholder={t("Example: 1.070")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* FG */}
          <FormField id="recipe-fg" label={t("Final Gravity (FG)")}>
            <input
              id="recipe-fg"
              name="fg"
              type="number"
              step="0.001"
              placeholder={t("Example: 1.010")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* Malt additions */}
          <div>
            <label className="block mb-2 font-semibold">{t("Malt additions")}</label>

            {malts.map((m, i) => (
              <div
                key={i}
                className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full"
              >
                <input
                  aria-label={`${t("Malt")} ${i + 1} ${t("name")}`}
                  placeholder={t("Malt type (e.g. Pale Ale, Munich)")}
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:flex-1"
                  value={m.name}
                  onChange={(e) => {
                    const updated = [...malts];
                    updated[i].name = e.target.value;
                    setMalts(updated);
                  }}
                />

                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="EBC"
                  aria-label={`${t("Malt")} ${i + 1} EBC`}
                  required
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-24"
                  value={m.ebc}
                  onChange={(e) => {
                    const updated = [...malts];
                    updated[i].ebc = e.target.value;
                    setMalts(updated);
                  }}
                />

                <UnitInput
                  kind="kg"
                  aria-label={`${t("Malt")} ${i + 1} ${t("Amount").toLowerCase()}`}
                  placeholder={`${t("Amount")} (${label("kg")})`}
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
                  {t("Remove")}
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addMalt}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
            >
              + {t("Add")} {t("malt")}
            </button>
          </div>

          <input type="hidden" name="malts_json" value={JSON.stringify(malts)} />

          {/* Hop additions */}
          <div>
            <label className="block mb-2 font-semibold">{t("Hop additions")}</label>

            {hops.map((h, i) => (
              <div
                key={i}
                className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full"
              >
                <input
                  aria-label={`${t("Hop addition")} ${i + 1} ${t("name")}`}
                  placeholder={t("Hop type (e.g. Citra, Mosaic)")}
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:flex-1"
                  value={h.name}
                  onChange={(e) => {
                    const updated = [...hops];
                    updated[i].name = e.target.value;
                    setHops(updated);
                  }}
                />

                <input
                  aria-label={`${t("Hop addition")} ${i + 1} ${t("Alpha acid (%)")}`}
                  placeholder={t("Alpha (%)")}
                  type="number"
                  min="0"
                  step="any"
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-24"
                  value={h.alpha}
                  onChange={(e) => {
                    const updated = [...hops];
                    updated[i].alpha = e.target.value;
                    setHops(updated);
                  }}
                />

                <input
                  aria-label={`${t("Hop addition")} ${i + 1} ${t("Year")}`}
                  placeholder={t("Year")}
                  type="number"
                  min="1900"
                  step="1"
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-24"
                  value={h.year}
                  onChange={(e) => {
                    const updated = [...hops];
                    updated[i].year = e.target.value;
                    setHops(updated);
                  }}
                />

                <UnitInput
  kind="g"
                  aria-label={`${t("Hop addition")} ${i + 1} ${t("Amount").toLowerCase()}`}
                  placeholder={`${t("Amount")} (${label("g")})`}
  className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-20"
  value={h.amount}
  onValueChange={(value) => {
    const updated = [...hops];
    updated[i].amount = value;
    setHops(updated);
  }}
/>

<select
  aria-label={`${t("Hop addition")} ${i + 1} ${t("type")}`}
  value={h.addition_type}
  onChange={(e) => {
    const updated = [...hops];
    updated[i].addition_type = e.target.value as "boil" | "whirlpool";
    setHops(updated);
  }}
  className="p-3 rounded bg-black/40 border border-white/20 w-full"
>
  <option value="boil">{t("Boil addition")}</option>
  <option value="whirlpool">{t("Whirlpool / hop stand")}</option>
</select>

<input
  aria-label={`${t("Hop addition")} ${i + 1} ${t("time in minutes")}`}
  placeholder={h.addition_type === "whirlpool" ? t("Stand time (min)") : t("Boil time (min)")}
  type="number"
  min="0"
  step="1"
  required={Boolean(h.name.trim() || h.amount.trim() || h.alpha.trim())}
  className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-20"
  value={h.time}
  onChange={(e) => {
    const updated = [...hops];
    updated[i].time = e.target.value;
    setHops(updated);
  }}
/>

{h.addition_type === "whirlpool" && (
  <input
    aria-label={`${t("Hop addition")} ${i + 1} ${t("whirlpool temperature in Celsius")}`}
    placeholder={t("Temperature (°C)")}
    type="number"
    min="0"
    max="100"
    step="any"
    required={Boolean(h.name.trim() || h.amount.trim() || h.alpha.trim())}
    className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-24"
    value={h.temperature}
    onChange={(e) => {
      const updated = [...hops];
      updated[i].temperature = e.target.value;
      setHops(updated);
    }}
  />
)}

                <button
                  type="button"
                  onClick={() => removeHop(i)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm self-start md:self-auto"
                >
                  {t("Remove")}
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addHop}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
            >
              + {t("Add")} {t("hop")}
            </button>
          </div>

          <input type="hidden" name="hops_json" value={JSON.stringify(hops)} />

          {/* Boil time */}
          <FormField id="recipe-boil-time" label={t("Boil time (minutes)")}>
            <input
              id="recipe-boil-time"
              name="boil_time"
              type="number"
              min="0"
              step="1"
              placeholder={t("Example: 60")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* Honey amount */}
          <FormField id="recipe-honey-amount" label={<>{t("Honey amount")} (<UnitSymbol kind="kg" />)</>}>
            <UnitInput
              id="recipe-honey-amount"
              name="honey_amount"
              kind="kg"
              placeholder={t("Example: 1.5")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* Honey type */}
          <FormField id="recipe-honey-type" label={t("Honey type")}>
            <input
              id="recipe-honey-type"
              name="honey_type"
              placeholder={t("Example: Wildflower, Clover, Heather")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>


          {/* Yeast */}
          <FormField id="recipe-yeast" label={t("Yeast strain")}>
            <input
              id="recipe-yeast"
              name="yeast"
              placeholder={t("Example: US-05 or Kveik")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* Additives */}
          <div>
            <label className="block mb-1 font-semibold">{t("Additives")}</label>
            <RecipeAdditiveFields />
          </div>
          {/* Full process */}
          <FormField id="recipe-process" label={t("Full process")}>
            <PublicMentionTextarea
              id="recipe-process"
              name="full_process"
              placeholder={t("Mash schedule, honey addition, fermentation plan...")}
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-40"
            />
          </FormField>

          {/* Notes */}
          <FormField id="recipe-notes" label={t("Notes")}>
            <PublicMentionTextarea
              id="recipe-notes"
              name="notes"
              placeholder={t("Any additional notes about the recipe...")}
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </FormField>
          <RecipeSecondaryFields />

          {/* Submit */}
          <button
            disabled={loading}
            className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            {loading ? t("Saving...") : t("Save recipe")}
          </button>
        </form>
      </div>
    </main>
  );
}
