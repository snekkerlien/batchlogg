"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitRecipe } from "../submitRecipe";
import MenuOverlay from "../../MenuOverlay";
import BackButton from "../../BackButton";
import FormField from "@/app/components/FormField";
import PublicMentionTextarea from "@/app/components/PublicMentionTextarea";
import { UnitInput, UnitSymbol, useUnits } from "../../../components/Units";
import BeerStyleSelect from "@/app/components/BeerStyleSelect";
import RecipeAdditiveFields from "../RecipeAdditiveFields";
import RecipeSecondaryFields from "../RecipeSecondaryFields";
import { calcDryHopIBU, calcEBC, calcIBU } from "@/lib/brewing/beerCalculators";
import BeerColorGlass from "@/app/components/BeerColorGlass";
import BitternessMeter from "@/app/components/BitternessMeter";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { translateRecipeError } from "@/lib/i18n/apiErrors";

export default function NewBeerRecipePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { label } = useUnits();
  const [beerSubtype, setBeerSubtype] = useState("");
  const [beerStyle, setBeerStyle] = useState("");
  const [volume, setVolume] = useState("");
  const [boilVolume, setBoilVolume] = useState("");
  const [og, setOg] = useState("");

  // ⭐ warnings fra server action
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");

  // MALTS (name + amount in kg)
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

  // HOPS (name + amount in g + time in min)
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
 const [dryHops, setDryHops] = useState<{ name: string; amount: string; contact: string; alpha: string; year: string }[]>([]);

function addDryHop() {
  setDryHops([...dryHops, { name: "", amount: "", contact: "", alpha: "", year: "" }]);
}

function removeDryHop(index: number) {
  const updated = [...dryHops];
  updated.splice(index, 1);
  setDryHops(updated);
}




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

  function removeHop(index: number) {
    const updated = [...hops];
    updated.splice(index, 1);
    setHops(updated);
  }

  const recipeEstimates = useMemo(() => {
    const finalVolumeL = Number(volume);
    const originalGravity = Number(og.replace(",", "."));
    if (
      !Number.isFinite(finalVolumeL) ||
      finalVolumeL <= 0 ||
      !Number.isFinite(originalGravity) ||
      originalGravity <= 1
    ) {
      return null;
    }

    const parsedBoilVolume = Number(boilVolume);
    const validBoilVolume =
      Number.isFinite(parsedBoilVolume) && parsedBoilVolume > 0
        ? parsedBoilVolume
        : finalVolumeL;
    const ibu =
      calcIBU(hops, originalGravity, finalVolumeL, validBoilVolume) +
      calcDryHopIBU(dryHops, finalVolumeL);
    const color = calcEBC(malts, finalVolumeL);
    return { ibu, ebc: color.ebc, maltWarnings: color.warnings };
  }, [boilVolume, dryHops, hops, malts, og, volume]);

  // ⭐ HANDLE SUBMIT (viktig)
  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setWarnings([]);
  setError("");

  const formData = new FormData(e.currentTarget as HTMLFormElement);
  const result = await submitRecipe(formData);

  // ❌ Feil maltnavn → stopp lagring
  if (result?.success === false) {
    setWarnings(result.maltWarnings ?? []);
    setError(result.error ?? (result.maltWarnings?.length ? "" : "Could not save the recipe."));
    setLoading(false);
    return;
  }

  // ✔ Alt OK → redirect
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
        <h1 className="text-4xl font-bold mb-2 text-center">{t("New Beer Recipe")}</h1>
        <p className="text-center opacity-80 mb-10">
          {t("Fill out the details below to create a new beer recipe.")}
        </p>

        {/* ⭐ WARNINGS */}
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
          <input type="hidden" name="type" value="Beer" />

          <div>
            <label htmlFor="beer-subtype" className="mb-1 block font-semibold">
              {t("Brewing method")}
            </label>
            <select
              id="beer-subtype"
              name="beer_subtype"
              value={beerSubtype}
              onChange={(event) => setBeerSubtype(event.target.value)}
              required
              className="w-full rounded border border-white/20 bg-zinc-900 p-3"
            >
              <option value="">{t("Choose a brewing method")}</option>
              <option value="all_grain">{t("All-grain")}</option>
              <option value="fresh_wort_kit">{t("Fresh wort kit")}</option>
              <option value="malt_extract_kit">{t("Malt extract kit")}</option>
            </select>
          </div>

          {beerSubtype && (
            <BeerStyleSelect
              id="beer-style"
              value={beerStyle}
              onChange={setBeerStyle}
            />
          )}

          {error && (
            <p role="alert" className="rounded border border-red-400/40 bg-red-950/50 p-3 text-red-200">
              {translateRecipeError(error, t)}
            </p>
          )}

          {beerSubtype && (
            <>
          {/* Recipe name */}
          <FormField
            id="recipe-name"
            label={beerSubtype === "all_grain" ? t("Recipe name") : t("Kit name")}
            required
          >
            <input
              id="recipe-name"
              name="name"
              placeholder={beerSubtype === "all_grain" ? t("Example: Pale Ale, IPA, Stout") : t("Name of the kit")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </FormField>

          {beerSubtype !== "all_grain" && (
            <FormField id="recipe-kit-url" label={t("Kit link (optional)")}>
              <input
                id="recipe-kit-url"
                name="kit_url"
                type="url"
                placeholder="https://example.com/kit"
                className="w-full rounded border border-white/20 bg-black/40 p-3"
              />
            </FormField>
          )}

          {/* Volume */}
          <FormField id="recipe-volume" label={<>{t("Volume")} (<UnitSymbol kind="volume" />)</>} required={beerSubtype !== "all_grain"}>
            <UnitInput
              id="recipe-volume"
              name="volume"
              kind="volume"
              placeholder={
                beerSubtype === "all_grain"
                  ? t("Final batch size after the boil (e.g., 20 L)")
                  : t("Final kit volume (e.g., 20 L)")
              }
              value={volume}
              onValueChange={setVolume}
              required={beerSubtype !== "all_grain"}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {beerSubtype === "all_grain" && (
          <>
          {/* Boil Volume */}
          <FormField id="recipe-boil-volume" label={<>{t("Boil Volume")} (<UnitSymbol kind="volume" />)</>}>
            <UnitInput
              id="recipe-boil-volume"
              name="boil_volume_l"
              kind="volume"
              placeholder={t("Total wort volume before the boil")}
              value={boilVolume}
              onValueChange={setBoilVolume}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>
          </>
          )}

          {/* OG */}
          <FormField id="recipe-og" label={t("Original Gravity (OG)")} required={beerSubtype !== "all_grain"}>
            <input
              id="recipe-og"
              name="og"
              type="text"
              placeholder={t("Example: 1.050")}
              value={og}
              onChange={(event) => setOg(event.target.value)}
              required={beerSubtype !== "all_grain"}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {beerSubtype === "all_grain" && (
            <section
              aria-labelledby="recipe-estimates-title"
              className="rounded-lg border border-white/15 bg-white/[0.04] p-4 text-center"
            >
              <h2 id="recipe-estimates-title" className="font-semibold text-white/85">
                {t("Live recipe estimates")}
              </h2>
              {recipeEstimates ? (
                <>
                  <dl className="mx-auto mt-3 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="min-w-0 rounded-lg border border-white/10 bg-black/10 p-3 text-left">
                      <dt className="mb-2 text-xs font-medium text-white/55">
                        {t("Bitterness")}
                      </dt>
                      <dd>
                        <BitternessMeter ibu={recipeEstimates.ibu} />
                      </dd>
                    </div>
                    <div className="min-w-0 rounded-lg border border-white/10 bg-black/10 p-3 text-left">
                      <dt className="mb-2 text-xs font-medium text-white/55">
                        {t("Color")}
                      </dt>
                      <dd>
                        <span className="flex min-h-[5.5rem] items-start">
                          <span className="flex items-baseline gap-1.5">
                            <span className="text-xl font-bold leading-none tracking-tight text-white">
                              {Math.round(recipeEstimates.ebc)}
                            </span>
                            <span className="text-xs font-medium text-white/50">
                              EBC
                            </span>
                          </span>
                          <span className="flex flex-1 -translate-x-3 items-center justify-center">
                            <BeerColorGlass ebc={recipeEstimates.ebc} />
                          </span>
                        </span>
                      </dd>
                    </div>
                  </dl>
                  {recipeEstimates.maltWarnings.length > 0 && (
                    <p role="status" className="mt-3 text-sm text-amber-200">
                      {t("Enter EBC values for all malt additions to complete the color estimate.")}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-white/50">
                    {t("Estimated values update as you edit ingredients. Bitterness is a guide; sweetness and style affect perception. Color is a model-based estimate.")}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-white/60">
                  {t("Enter a valid original gravity and final volume to see estimates.")}
                </p>
              )}
            </section>
          )}

          {beerSubtype === "fresh_wort_kit" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block font-semibold">
                {t("IBU (from kit)")}
                <input
                  name="ibu"
                  type="number"
                  min="0"
                  step="any"
                  required
                  className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3 font-normal"
                />
              </label>
              <label className="block font-semibold">
                {t("EBC (from kit)")}
                <input
                  name="ebc"
                  type="number"
                  min="0"
                  step="any"
                  required
                  className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3 font-normal"
                />
              </label>
            </div>
          )}

          {beerSubtype === "all_grain" && (
          <>
          {/* FG */}
          <FormField id="recipe-fg" label={t("Final Gravity (FG)")}>
            <input
              id="recipe-fg"
              name="fg"
              type="text"
              placeholder={t("Example: 1.010")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>
          </>
          )}

          {/* Yeast */}
          <FormField id="recipe-yeast" label={t("Yeast")} required={beerSubtype !== "all_grain"}>
            <input
              id="recipe-yeast"
              name="yeast"
              type="text"
              placeholder={t("Example: US-05")}
              required={beerSubtype !== "all_grain"}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {beerSubtype === "all_grain" && (
          <>
          {/* MALTS */}
          <div>
            <label className="block mb-2 font-semibold">{t("Malt additions")}</label>

            {malts.map((m, i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full">
                <input
                  aria-label={`${t("Malt")} ${i + 1} ${t("name")}`}
                  placeholder={t("Malt type")}
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
                  className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-32"
                  value={m.amount}
                  onValueChange={(value) => {
                    const updated = [...malts];
                    updated[i].amount = value;
                    setMalts(updated);
                  }}
                />

                <button
                  type="button"
                  onClick={() => removeMalt(i)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
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
          </>
          )}

          {beerSubtype === "all_grain" && (
          <>
          {/* HOPS */}
          <div>
            <label className="block mb-2 font-semibold">{t("Hop additions")}</label>

            {hops.map((h, i) => (
              <div key={i} className="mb-4 w-full space-y-2">
                <input
                  aria-label={`${t("Hop addition")} ${i + 1} ${t("name")}`}
                  placeholder={t("Hop type")}
                  className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
                  value={h.name}
                  onChange={(e) => {
                    const updated = [...hops];
                    updated[i].name = e.target.value;
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
                  className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
                >
                  <option value="boil">{t("Boil addition")}</option>
                  <option value="whirlpool">{t("Whirlpool / hop stand")}</option>
                </select>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(6.5rem,0.8fr)_minmax(5rem,0.6fr)_minmax(7rem,1fr)_minmax(9rem,1.4fr)_auto]">
                <input
                  aria-label={`${t("Hop addition")} ${i + 1} ${t("Alpha acid (%)")}`}
                  placeholder={t("Alpha (%)")}
                  type="number"
                  min="0"
                  step="any"
                  className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
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
  className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
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
                  className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
                  value={h.amount}
                  onValueChange={(value) => {
                    const updated = [...hops];
                    updated[i].amount = value;
                    setHops(updated);
                  }}
                />

                <input
                  aria-label={`${t("Hop addition")} ${i + 1} ${t("time in minutes")}`}
                  placeholder={
                    h.addition_type === "whirlpool"
                      ? t("Stand time (min)")
                      : t("Boil time (min)")
                  }
                  type="number"
                  min="0"
                  step="1"
                  required={Boolean(h.name.trim() || h.amount.trim() || h.alpha.trim())}
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
                    aria-label={`${t("Hop addition")} ${i + 1} ${t("whirlpool temperature in Celsius")}`}
                    placeholder={t("Temperature (°C)")}
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    required={Boolean(h.name.trim() || h.amount.trim() || h.alpha.trim())}
                    className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
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
                  className="col-span-2 justify-self-end rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm hover:bg-white/20 sm:col-span-1 sm:justify-self-auto"
                >
                  {t("Remove")}
                </button>
                </div>
              </div>
            ))}

            <p className="mb-3 text-sm opacity-70">
              {t("For whirlpool additions, enter the hop-stand duration and temperature. Whirlpool IBU is estimated from the temperature and may differ from the recipe's measured or published value.")}
            </p>

            <button
              type="button"
              onClick={addHop}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
            >
              + {t("Add")} {t("hop")}
            </button>
          </div>

          <input
            type="hidden"
            name="hops_json"
            value={JSON.stringify(beerSubtype === "all_grain" ? hops : [])}
          />
          </>
          )}

        {/* DRY HOPS */}
{beerSubtype && (
<>
<div>
  <label className="mb-2 block font-semibold">
    {t("Dry hop additions")}
  </label>

  {dryHops.map((h, i) => (
    <div key={i} className="mb-4 w-full space-y-2">

      <input
        aria-label={`${t("Dry hop")} ${i + 1} ${t("name")}`}
        placeholder={t("Hop type")}
        className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
        value={h.name}
        onChange={(e) => {
          const updated = [...dryHops];
          updated[i].name = e.target.value;
          setDryHops(updated);
        }}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(6.5rem,0.8fr)_minmax(5rem,0.6fr)_minmax(7rem,1fr)_minmax(9rem,1.4fr)_auto]">
      <input
        aria-label={`${t("Dry hop")} ${i + 1} ${t("Alpha acid (%)")}`}
        placeholder={t("Alpha (%)")}
        type="number"
        min="0"
        step="any"
        className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
        value={h.alpha}
        onChange={(e) => {
          const updated = [...dryHops];
          updated[i].alpha = e.target.value;
          setDryHops(updated);
        }}
      />

      <input
        aria-label={`${t("Dry hop")} ${i + 1} ${t("Year")}`}
        placeholder={t("Year")}
        type="number"
        min="1900"
        step="1"
        className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
        value={h.year}
        onChange={(e) => {
          const updated = [...dryHops];
          updated[i].year = e.target.value;
          setDryHops(updated);
        }}
      />

      <UnitInput
        kind="g"
        aria-label={`${t("Dry hop")} ${i + 1} ${t("Amount").toLowerCase()}`}
        placeholder={`${t("Amount")} (${label("g")})`}
        className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
        value={h.amount}
        onValueChange={(value) => {
          const updated = [...dryHops];
          updated[i].amount = value;
          setDryHops(updated);
        }}
      />

      <input
        aria-label={`${t("Dry hop")} ${i + 1} ${t("contact time in days")}`}
        placeholder={t("Contact time (days)")}
        type="text"
        className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
        value={h.contact}
        onChange={(e) => {
          const updated = [...dryHops];
          updated[i].contact = e.target.value;
          setDryHops(updated);
        }}
      />

      <button
        type="button"
        onClick={() => removeDryHop(i)}
        className="col-span-2 justify-self-end rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm hover:bg-white/20 sm:col-span-1 sm:justify-self-auto"
      >
        {t("Remove")}
      </button>
      </div>
    </div>
  ))}

  <button
    type="button"
    onClick={addDryHop}
    className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
  >
    + {t("Add")} {t("dry hop")}
  </button>
</div>

<input type="hidden" name="dry_hops_json" value={JSON.stringify(dryHops)} />
          </>
)}




          {beerSubtype === "all_grain" && (
          <>
          {/* Boil time */}
          <FormField id="recipe-boil-time" label={t("Total boil time (minutes)")}>
            <input
              id="recipe-boil-time"
              name="boil_time"
              type="number"
              min="0"
              step="1"
              placeholder={t("Length of the boil")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>
          </>
          )}

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
              placeholder={t("Mash schedule, hop schedule...")}
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-40"
            />
          </FormField>

          {/* Notes */}
          <FormField id="recipe-notes" label={t("Notes")}>
            <PublicMentionTextarea
              id="recipe-notes"
              name="notes"
              placeholder={t("Any additional notes...")}
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
            </>
          )}
        </form>
      </div>
    </main>
  );
}
