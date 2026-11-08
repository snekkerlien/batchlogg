"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import PageHeading from "@/app/components/PageHeading";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import BottleCountCalculator from "./BottleCountCalculator";
import BrewDayWaterCalculator from "./BrewDayWaterCalculator";
import CalculatorDisclosure from "./CalculatorDisclosure";
import RefractometerCorrectionCalculator from "./RefractometerCorrectionCalculator";
import WaterChemistryCalculator from "./WaterChemistryCalculator";
import CalculatorResult from "./CalculatorResult";
import PageGuide from "@/app/components/PageGuide";
import { getCalculatorInputError, parseCalculatorNumber } from "@/lib/brewing/calculatorValidation";
import { Qty, UnitInput, UnitSymbol } from "@/app/components/Units";
import {
  calculateAbvFromGravity,
  calculateDilutedAbv,
  calculateDilutedGravity,
  calculateVolumeForTargetAbv,
  convertGravityToSpecificGravity,
  type GravityScale,
} from "@/lib/brewing/calculators";

export default function ABVToolsClient() {
  const { t } = useTranslation();
  const [og, setOg] = useState("");
  const [fg, setFg] = useState("");
  const [gravityScale, setGravityScale] = useState<GravityScale>("sg");

  // ⭐ Blend/Fortify states
  const [dilutionAbv, setDilutionAbv] = useState("");
  const [dilutionVol, setDilutionVol] = useState("");
  const [dilutionAddedVol, setDilutionAddedVol] = useState("");


  // ⭐ Target ABV states
  const [targetBatchAbv, setTargetBatchAbv] = useState("");
  const [targetBatchVol, setTargetBatchVol] = useState("");
  const [targetAddAbv, setTargetAddAbv] = useState("");
  const [targetDesiredAbv, setTargetDesiredAbv] = useState("");

  // ⭐ OG Dilution states
const [ogDilutionOg, setOgDilutionOg] = useState("");
const [ogDilutionVol, setOgDilutionVol] = useState("");
const [ogDilutionAddedVol, setOgDilutionAddedVol] = useState("");

const gravityScales: { value: GravityScale; label: string }[] = [
  { value: "sg", label: "Specific Gravity" },
  { value: "oechsle", label: "Oechsle" },
  { value: "plato", label: "Plato" },
  { value: "brix", label: "Brix" },
  { value: "balling", label: "Balling" },
];

  const original = convertGravityToSpecificGravity(parseCalculatorNumber(og), gravityScale);
  const final = convertGravityToSpecificGravity(parseCalculatorNumber(fg), gravityScale);
  const abv = original !== null && final !== null
    ? calculateAbvFromGravity(original, final)
    : null;
  const gravityMin = gravityScale === "sg" ? 0.8 : 0;
  const gravityMax = gravityScale === "sg" ? 2 : gravityScale === "oechsle" ? 1000 : 100;
  const gravityError = getCalculatorInputError([
    { label: "OG", value: og, min: gravityMin, max: gravityMax },
    { label: "FG", value: fg, min: gravityMin, max: gravityMax },
  ]) || (original !== null && final !== null && original < final
    ? "FG cannot be higher than OG. Check that both readings use the selected scale."
    : original !== null && final !== null && abv === null
      ? "These readings imply ABV above 100%. Check your readings and gravity scale."
      : null);

  const dilutionResult = calculateDilutedAbv(
    parseCalculatorNumber(dilutionAbv), parseCalculatorNumber(dilutionVol), parseCalculatorNumber(dilutionAddedVol)
  );
  const dilutionError = getCalculatorInputError([
    { label: "Current ABV (%)", value: dilutionAbv, min: 0, max: 100 },
    { label: "Batch volume", value: dilutionVol, positive: true },
    { label: "Volume added", value: dilutionAddedVol, min: 0 },
  ]);

  const targetResult = calculateVolumeForTargetAbv(
    parseCalculatorNumber(targetBatchAbv), parseCalculatorNumber(targetBatchVol),
    parseCalculatorNumber(targetAddAbv), parseCalculatorNumber(targetDesiredAbv)
  );
  const targetInputs = {
    "current ABV": targetBatchAbv, "batch volume": targetBatchVol,
    "addition ABV": targetAddAbv, "target ABV": targetDesiredAbv,
  };
  const targetError = getCalculatorInputError([
    { label: "Current ABV (%)", value: targetBatchAbv, min: 0, max: 100 },
    { label: "Batch volume", value: targetBatchVol, positive: true },
    { label: "Addition ABV (%)", value: targetAddAbv, min: 0, max: 100 },
    { label: "Target ABV (%)", value: targetDesiredAbv, min: 0, max: 100 },
  ]) || (Object.values(targetInputs).every(value => value.trim()) && targetResult === null
    ? "The target must lie strictly between the batch and addition ABVs, or equal the current ABV (no addition). You cannot reach the addition's exact ABV with a finite addition."
    : null);

  const ogDilutionResult = calculateDilutedGravity(
    parseCalculatorNumber(ogDilutionOg), parseCalculatorNumber(ogDilutionVol), parseCalculatorNumber(ogDilutionAddedVol)
  );
  const ogDilutionError = getCalculatorInputError([
    { label: "Original OG (SG)", value: ogDilutionOg, min: 1, max: 2 },
    { label: "Batch volume", value: ogDilutionVol, positive: true },
    { label: "Water added", value: ogDilutionAddedVol, min: 0 },
  ]);

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-4xl border border-white/10 relative pt-16 sm:pt-16">

        <PublicPageNavigation current="abvtools" />

        <PageHeading
          title={t("Brewing calculators")}
          subtitle={t("Calculate alcohol strength, plan water, and prepare your brew.")}
        />

        <nav
          aria-label={t("Jump to a calculator")}
          className="my-6 flex flex-wrap justify-center gap-2"
        >
          {[
            ["abv-calculator", "ABV"],
            ["dilution-calculator", "Dilution"],
            ["target-abv-calculator", "Target ABV"],
            ["og-dilution-calculator", "OG dilution"],
            ["bottle-count-calculator", "Bottle count"],
            ["brew-day-water-calculator", "Brew-day water"],
            ["water-chemistry-calculator", "Water chemistry"],
            ["refractometer-correction", "Refractometer correction"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => {
                const target = document.getElementById(id);
                if (target instanceof HTMLDetailsElement) target.open = true;
              }}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-green-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300"
            >
              {t(label)}
            </a>
          ))}
        </nav>

        {/* ⭐ ABV CALCULATOR — MATCHER DE ANDRE SEKSJONENE */}
        <CalculatorDisclosure
          id="abv-calculator"
          title="ABV calculator"
          description="Calculate ABV from Original Gravity (OG) and Final Gravity (FG). Choose the gravity scale shown by your hydrometer or brewing tool."
          defaultOpen
        >
          <div className="space-y-6">
            <div
              role="group"
              aria-label={t("Gravity scale")}
              className="flex flex-wrap justify-center gap-2"
            >
              {gravityScales.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGravityScale(value)}
                  aria-pressed={gravityScale === value}
                  className={`rounded-lg border px-3 py-2 text-center text-sm ${
                    gravityScale === value
                      ? "border-green-500 bg-green-700"
                      : "border-white/20 bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {t(label)}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block opacity-80">
                {t("Original Gravity (OG)")}
                <input
                  type="number"
                  value={og}
                  onChange={(event) => setOg(event.target.value)}
                  placeholder={
                    gravityScale === "sg"
                      ? "e.g. 1.050"
                      : gravityScale === "oechsle"
                        ? "e.g. 50"
                        : "e.g. 12.4"
                  }
                  step="any"
                  className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3"
                />
              </label>
              <label className="block opacity-80">
                {t("Final Gravity (FG)")}
                <input
                  type="number"
                  value={fg}
                  onChange={(event) => setFg(event.target.value)}
                  placeholder={
                    gravityScale === "sg"
                      ? "e.g. 1.010"
                      : gravityScale === "oechsle"
                        ? "e.g. 10"
                        : "e.g. 2.6"
                  }
                  step="any"
                  className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3"
                />
              </label>
            </div>
            <p className="text-xs leading-5 text-white/55">
              {t("Brix, Plato, and Balling are very close for typical brewing readings, so this calculator uses the same approximate conversion for those scales; identical readings may give the same result. A post-fermentation refractometer Brix reading needs alcohol correction before using it as FG; enter a corrected reading here.")}
            </p>
            <p className="text-center text-sm">
              <a
                href="#refractometer-correction"
                onClick={() => {
                  const target = document.getElementById("refractometer-correction");
                  if (target instanceof HTMLDetailsElement) target.open = true;
                }}
                className="font-semibold text-green-300 underline underline-offset-4 hover:text-green-200"
              >
                {t("Correct a post-fermentation refractometer reading")}
              </a>
            </p>

            <CalculatorResult
              name="ABV calculator"
              inputs={{ OG: og, FG: fg }}
              error={gravityError}
              hasResult={abv !== null}
              assumptions="Estimated ABV = (OG − FG) × 131.25. Use temperature-corrected hydrometer readings or alcohol-corrected refractometer readings. Brix, Plato, and Balling use the same approximate SG conversion."
              onReset={() => { setOg(""); setFg(""); setGravityScale("sg"); }}
            >
              <div className="text-center">
                <p className="text-xl font-bold">{t("Estimated ABV")}: {abv?.toFixed(2)}%</p>
                {original !== null && final !== null && (
                  <p className="mt-1 text-sm text-white/55">
                    {t("Converted to SG: OG {og}, FG {fg}")
                      .replace("{og}", original.toFixed(3))
                      .replace("{fg}", final.toFixed(3))}
                  </p>
                )}
              </div>
            </CalculatorResult>
          </div>
        </CalculatorDisclosure>

        {/* ⭐ DILUTION CALCULATOR */}
<CalculatorDisclosure
  id="dilution-calculator"
  title="Dilution calculator"
  description="Find your new ABV after adding water, juice, or another alcohol-free liquid."
  className="mt-6"
>
  <div className="space-y-6">

    {/* Your batch */}
    <div>
      <h3 className="text-xl font-semibold mb-2">{t("Your batch")}</h3>

      <label htmlFor="dilution-abv" className="block mb-1 opacity-80">{t("Current ABV (%)")}</label>
      <input
        id="dilution-abv"
        type="text"
        value={dilutionAbv}
        onChange={(e) => setDilutionAbv(e.target.value)}
        placeholder={t("e.g. 10")}
        className="w-full p-3 rounded bg-black/40 border border-white/20"
      />

      <label htmlFor="dilution-volume" className="block mt-4 mb-1 opacity-80">{t("Volume")} (<UnitSymbol kind="volume" />)</label>
      <UnitInput id="dilution-volume" kind="volume" value={dilutionVol} onValueChange={setDilutionVol} placeholder={t("e.g. 20")} className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    {/* Added volume */}
    <div>
      <label htmlFor="dilution-added-volume" className="block mb-1 opacity-80">{t("Volume added")} (<UnitSymbol kind="volume" />)</label>
      <UnitInput id="dilution-added-volume" kind="volume" value={dilutionAddedVol} onValueChange={setDilutionAddedVol} placeholder={t("e.g. 5")} className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    {/* Result */}
    <CalculatorResult
      name="dilution calculator"
      inputs={{ "current ABV": dilutionAbv, "batch volume": dilutionVol, "volume added": dilutionAddedVol }}
      error={dilutionError}
      hasResult={dilutionResult !== null}
      assumptions="The added liquid has 0% ABV, alcohol is conserved, and volumes add directly without contraction. Juice may ferment later; this is the immediate ABV, not a prediction after fermentation. Use Target ABV for alcoholic additions."
      onReset={() => { setDilutionAbv(""); setDilutionVol(""); setDilutionAddedVol(""); }}
    >
      <p className="text-center text-xl font-bold">
        {t("New ABV")}: {dilutionResult?.toFixed(2)}%
      </p>
    </CalculatorResult>
  </div>
</CalculatorDisclosure>


        {/* ⭐ TARGET ABV SECTION */}
        <CalculatorDisclosure
          id="target-abv-calculator"
          title="Target ABV calculator"
          description="Calculate how much liquid you must add to reach a specific ABV."
          className="mt-6"
        >
          <div className="space-y-6">

            {/* Current batch */}
            <div>
              <h3 className="text-xl font-semibold mb-2">{t("Your batch")}</h3>

              <label htmlFor="target-current-abv" className="block mb-1 opacity-80">{t("Current ABV (%)")}</label>
              <input
                id="target-current-abv"
                type="text"
                value={targetBatchAbv}
                onChange={(e) => setTargetBatchAbv(e.target.value)}
                placeholder={t("e.g. 10")}
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />

              <label htmlFor="target-batch-volume" className="block mt-4 mb-1 opacity-80">{t("Volume")} (<UnitSymbol kind="volume" />)</label>
              <UnitInput id="target-batch-volume" kind="volume" value={targetBatchVol} onValueChange={setTargetBatchVol} placeholder={t("e.g. 20")} className="w-full p-3 rounded bg-black/40 border border-white/20" />
            </div>

            {/* Addition ABV */}
            <div>
              <h3 className="text-xl font-semibold mb-2">{t("Addition")}</h3>

              <label htmlFor="target-addition-abv" className="block mb-1 opacity-80">{t("ABV (%)")}</label>
              <input
                id="target-addition-abv"
                type="number"
                value={targetAddAbv}
                onChange={(e) => setTargetAddAbv(e.target.value)}
                placeholder={t("ABV for your addition of choice (e.g. 0 for juice, 40 for vodka)")}
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />
            </div>

            {/* Desired ABV */}
            <div>
              <h3 className="text-xl font-semibold mb-2">{t("Desired ABV")}</h3>

              <label htmlFor="desired-abv" className="block mb-1 opacity-80">{t("Target ABV (%)")}</label>
              <input
                id="desired-abv"
                type="number"
                value={targetDesiredAbv}
                onChange={(e) => setTargetDesiredAbv(e.target.value)}
                placeholder={t("Desired ABV you want to achieve (e.g. 20)")}
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />
            </div>

            {/* Result */}
            <CalculatorResult
              name="target ABV calculator"
              inputs={targetInputs}
              error={targetError}
              hasResult={targetResult !== null}
              assumptions="Alcohol is conserved and volumes add directly without contraction or further fermentation. A target equal to the current ABV needs no addition; other targets must be between the two strengths."
              onReset={() => { setTargetBatchAbv(""); setTargetBatchVol(""); setTargetAddAbv(""); setTargetDesiredAbv(""); }}
            >
              <p className="text-center text-xl font-bold">
                {t("Required addition")}: <Qty kind="volume" value={targetResult} />
              </p>
              {targetResult === 0 && <p className="mt-2 text-center text-sm">{t("Your batch is already at the target ABV. No addition is needed.")}</p>}
            </CalculatorResult>
          </div>
        </CalculatorDisclosure>

        {/* ⭐ OG DILUTION CALCULATOR */}
<CalculatorDisclosure
  id="og-dilution-calculator"
  title="OG dilution calculator"
  description="Calculate your new OG after adding water or other non-sugar liquids."
  className="mt-6"
>
  <div className="space-y-6">

    {/* Original batch */}
    <div>
      <h3 className="text-xl font-semibold mb-2">{t("Your batch")}</h3>

      <label htmlFor="og-dilution-original-gravity" className="block mb-1 opacity-80">{t("Original OG")}</label>
      <input
        id="og-dilution-original-gravity"
        type="text"
        value={ogDilutionOg}
        onChange={(e) => setOgDilutionOg(e.target.value)}
        placeholder={t("e.g. 1.100")}
        className="w-full p-3 rounded bg-black/40 border border-white/20"
      />

      <label htmlFor="og-dilution-volume" className="block mt-4 mb-1 opacity-80">{t("Volume")} (<UnitSymbol kind="volume" />)</label>
      <UnitInput id="og-dilution-volume" kind="volume" value={ogDilutionVol} onValueChange={setOgDilutionVol} placeholder={t("e.g. 4")} className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    {/* Added water */}
    <div>
      <label htmlFor="og-dilution-added-volume" className="block mb-1 opacity-80">{t("Water added")} (<UnitSymbol kind="volume" />)</label>
      <UnitInput id="og-dilution-added-volume" kind="volume" value={ogDilutionAddedVol} onValueChange={setOgDilutionAddedVol} placeholder={t("e.g. 1")} className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    {/* Result */}
    <CalculatorResult
      name="OG dilution calculator"
      inputs={{ "original OG": ogDilutionOg, "batch volume": ogDilutionVol, "water added": ogDilutionAddedVol }}
      error={ogDilutionError}
      hasResult={ogDilutionResult !== null}
      assumptions="Pre-fermentation dilution with sugar-free water at SG 1.000. Gravity points are conserved and volumes add directly. Do not use this for juice, fermentable additions, or a fermented drink's FG."
      onReset={() => { setOgDilutionOg(""); setOgDilutionVol(""); setOgDilutionAddedVol(""); }}
    >
      <p className="text-center text-xl font-bold">
        {t("New OG")}: {ogDilutionResult?.toFixed(3)} SG
      </p>
    </CalculatorResult>
  </div>
</CalculatorDisclosure>

          <BottleCountCalculator />
        <BrewDayWaterCalculator />
        <WaterChemistryCalculator />
        <RefractometerCorrectionCalculator />
        <section className="mt-12 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-green-300">
            {t("Using the brewing calculators")}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-white/75">
            <p>{t("Results update automatically. “Waiting for input” lists missing fields; “Check your inputs” explains invalid values or impossible combinations. Enter an explicit zero where appropriate. Each calculated result includes its assumptions. Reset clears only that calculator and restores its default scale or mode; it does not delete saved profiles or change your unit preference. Refractometer reset restores WCF to 1.04; resetting the optional WCF calibration only clears its two sample readings.")}</p>
            <p>{t("The ABV calculator accepts specific gravity, Oechsle, Plato, Brix, or Balling for OG and FG, and converts those readings to specific gravity before estimating alcohol. For typical brewing readings Brix, Plato, and Balling are close enough that the calculator uses the same approximation for them, and ABV is displayed to two decimal places. For a post-fermentation refractometer reading, use the refractometer alcohol-correction calculator above before entering FG. Other gravity tools use specific-gravity values (for example, 1.050). Enter alcohol strength as a percentage and volume in the unit shown beside each field; the volume unit follows your saved preference when signed in or your local setting when signed out.")}</p>
            <p>{t("The gravity ABV estimate uses (OG − FG) × 131.25. Dilution tools assume volumes combine directly and alcohol is conserved; the OG dilution tool assumes the added liquid contains no fermentable sugar. Real mixtures can contract, and fermentation may not reach the assumed final gravity.")}</p>
            <p>{t("The bottle-count calculator divides the volume available to fill by the amount put in each bottle, then reports full bottles and any leftover volume. Enter the net volume ready to bottle and the planned fill volume per bottle; it does not estimate transfer loss or extra volume for spills or overfilling.")}</p>
            <p>{t("The all-grain water planner estimates mash, sparge, total, and pre-boil water from your target fermenter volume and measured equipment settings. Its saved equipment profiles store boil-off, kettle loss, grain absorption, mash ratio, and tun dead space. Measure these on your own setup and refine them over several brews; the estimate assumes a single-infusion mash and does not include top-up water or decoction.")}</p>
            <p>{t("The water chemistry planner uses a water report and a starting target ion profile to estimate mineral additions for the entered water volume. You can save named profiles containing both your source-water report and target ions for reuse. Check your supplier's latest report or use a certified lab for well water. Salt combinations affect multiple ions, so review the predicted values rather than expecting every target to match exactly. The acid estimate only approximates alkalinity neutralization; it does not predict mash pH. Treat additions as a starting point, follow product instructions, and verify with measurements.")}</p>
          </div>
        </section>
      </div>
      <PageGuide
        buttonLabel={t("Brewing calculators guide")}
        eyebrow={t("Choose the right tool for the question")}
        title={t("Your brewing calculators, explained.")}
        description={t("Use these calculators to estimate strength, adjust a batch, plan water, and make sense of brewing measurements.")}
        sectionHeading={t("Find a calculator")}
        illustration="calculators"
        footer={t("Calculator results are estimates; check the assumptions shown with each result.")}
        sections={[
          {
            title: t("ABV from gravity"),
            description: t("Enter original and final gravity, choosing the scale used by your measuring tool."),
          },
          {
            title: t("Dilution and target strength"),
            description: t("Estimate the effect of adding water or alcohol, or calculate an addition to reach a target ABV."),
          },
          {
            title: t("OG dilution"),
            description: t("Estimate the new original gravity after adding water to wort or must."),
          },
          {
            title: t("Bottle count"),
            description: t("Calculate full bottles and leftover volume from the amount available to bottle and your chosen fill size."),
          },
          {
            title: t("Brew-day water"),
            description: t("Plan mash and sparge water volumes using a saved equipment profile or your entered values."),
          },
          {
            title: t("Water chemistry"),
            description: t("Review a water profile and calculate mineral additions for a brewing target."),
          },
          {
            title: t("Refractometer correction"),
            description: t("Correct a refractometer reading during fermentation using your original gravity and calibration data."),
          },
        ]}
      />
    </main>
  );
}
