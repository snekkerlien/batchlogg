"use client";

import { useState } from "react";
import PageHeading from "@/app/components/PageHeading";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import BrewDayWaterCalculator from "./BrewDayWaterCalculator";
import RefractometerCorrectionCalculator from "./RefractometerCorrectionCalculator";
import WaterChemistryCalculator from "./WaterChemistryCalculator";
import CalculatorResult from "./CalculatorResult";
import { getCalculatorInputError, parseCalculatorNumber } from "@/lib/brewing/calculatorValidation";
import { Qty, UnitInput, UnitSymbol } from "@/app/components/Units";
import {
  calculateAbvFromGravity,
  calculateDilutedAbv,
  calculateDilutedGravity,
  calculateFermentableForAbv,
  calculateOgForAbv,
  calculateVolumeForTargetAbv,
  convertGravityToSpecificGravity,
  type GravityScale,
} from "@/lib/brewing/calculators";

export default function ABVToolsClient() {
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

const [targetAbvVol, setTargetAbvVol] = useState("");
const [targetAbvPercent, setTargetAbvPercent] = useState("");
const [abvMode, setAbvMode] = useState<"sugar" | "honey">("sugar");
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

  const fermentableNeeded = calculateFermentableForAbv(
    parseCalculatorNumber(targetAbvVol), parseCalculatorNumber(targetAbvPercent), abvMode
  );
  const estimatedOg = calculateOgForAbv(parseCalculatorNumber(targetAbvPercent));
  const fermentableError = getCalculatorInputError([
    { label: "Final batch volume", value: targetAbvVol, positive: true },
    { label: "Desired ABV (%)", value: targetAbvPercent, min: 0, max: 100 },
  ]);


  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-4xl border border-white/10 relative pt-16 sm:pt-16">

        <PublicPageNavigation current="abvtools" />

        <PageHeading
          title="Brewing calculators"
          subtitle="Calculate alcohol strength, plan water, and prepare your brew."
        />

        {/* ⭐ ABV CALCULATOR — MATCHER DE ANDRE SEKSJONENE */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
          <h2 className="text-2xl font-bold mb-2 text-green-300 text-center">
            ABV Calculator
          </h2>
          <p className="text-center opacity-70 mb-6">
            Calculate ABV from Original Gravity (OG) and Final Gravity (FG).
            Choose the gravity scale shown by your hydrometer or brewing tool.
          </p>

          <div className="space-y-6">
            <div
              role="group"
              aria-label="Gravity scale"
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
                  {label}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block opacity-80">
                Original Gravity (OG)
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
                Final Gravity (FG)
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
              Brix, Plato, and Balling are very close for typical brewing
              readings, so this calculator uses the same approximate
              conversion for those scales; identical readings may give the same
              result. A post-fermentation refractometer Brix reading needs
              alcohol correction before using it as FG; enter a corrected
              reading here.
            </p>
            <p className="text-center text-sm">
              <a
                href="#refractometer-correction"
                className="font-semibold text-green-300 underline underline-offset-4 hover:text-green-200"
              >
                Correct a post-fermentation refractometer reading
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
                <p className="text-xl font-bold">Estimated ABV: {abv?.toFixed(2)}%</p>
                {original !== null && final !== null && (
                  <p className="mt-1 text-sm text-white/55">
                    Converted to SG: OG{" "}
                    {original.toFixed(3)}, FG{" "}
                    {final.toFixed(3)}
                  </p>
                )}
              </div>
            </CalculatorResult>
          </div>
        </div>

        {/* ⭐ DILUTION CALCULATOR */}
<div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-xl">
  <h2 className="text-2xl font-bold mb-2 text-green-300 text-center">
  Dilution Calculator
</h2>
<p className="text-center opacity-70 mb-6">
  Find your new ABV after adding water, juice, or another alcohol-free liquid.
</p>


  <div className="space-y-6">

    {/* Your batch */}
    <div>
      <h3 className="text-xl font-semibold mb-2">Your batch</h3>

      <label htmlFor="dilution-abv" className="block mb-1 opacity-80">Current ABV (%)</label>
      <input
        id="dilution-abv"
        type="text"
        value={dilutionAbv}
        onChange={(e) => setDilutionAbv(e.target.value)}
        placeholder="e.g. 10"
        className="w-full p-3 rounded bg-black/40 border border-white/20"
      />

      <label htmlFor="dilution-volume" className="block mt-4 mb-1 opacity-80">Volume (<UnitSymbol kind="volume" />)</label>
      <UnitInput id="dilution-volume" kind="volume" value={dilutionVol} onValueChange={setDilutionVol} placeholder="e.g. 20" className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    {/* Added volume */}
    <div>
      <label htmlFor="dilution-added-volume" className="block mb-1 opacity-80">Volume added (<UnitSymbol kind="volume" />)</label>
      <UnitInput id="dilution-added-volume" kind="volume" value={dilutionAddedVol} onValueChange={setDilutionAddedVol} placeholder="e.g. 5" className="w-full p-3 rounded bg-black/40 border border-white/20" />
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
        New ABV: {dilutionResult?.toFixed(2)}%
      </p>
    </CalculatorResult>
  </div>
</div>


        {/* ⭐ TARGET ABV SECTION */}
        <div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-xl">
          <h2 className="text-2xl font-bold mb-2 text-green-300 text-center">
  Target ABV Calculator
</h2>
<p className="text-center opacity-70 mb-6">
  Calculate how much liquid you must add to reach a specific ABV.
</p>


          <div className="space-y-6">

            {/* Current batch */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Your batch</h3>

              <label htmlFor="target-current-abv" className="block mb-1 opacity-80">Current ABV (%)</label>
              <input
                id="target-current-abv"
                type="text"
                value={targetBatchAbv}
                onChange={(e) => setTargetBatchAbv(e.target.value)}
                placeholder="e.g. 10"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />

              <label htmlFor="target-batch-volume" className="block mt-4 mb-1 opacity-80">Volume (<UnitSymbol kind="volume" />)</label>
              <UnitInput id="target-batch-volume" kind="volume" value={targetBatchVol} onValueChange={setTargetBatchVol} placeholder="e.g. 20" className="w-full p-3 rounded bg-black/40 border border-white/20" />
            </div>

            {/* Addition ABV */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Addition</h3>

              <label htmlFor="target-addition-abv" className="block mb-1 opacity-80">ABV (%)</label>
              <input
                id="target-addition-abv"
                type="number"
                value={targetAddAbv}
                onChange={(e) => setTargetAddAbv(e.target.value)}
                placeholder="ABV for your addition of choice (e.g. 0 for juice, 40 for vodka)"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />
            </div>

            {/* Desired ABV */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Desired ABV</h3>

              <label htmlFor="desired-abv" className="block mb-1 opacity-80">Target ABV (%)</label>
              <input
                id="desired-abv"
                type="number"
                value={targetDesiredAbv}
                onChange={(e) => setTargetDesiredAbv(e.target.value)}
                placeholder="Desired ABV you want to achieve (e.g. 20)"
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
                Required addition: <Qty kind="volume" value={targetResult} />
              </p>
              {targetResult === 0 && <p className="mt-2 text-center text-sm">Your batch is already at the target ABV. No addition is needed.</p>}
            </CalculatorResult>
          </div>
        </div>

        {/* ⭐ OG DILUTION CALCULATOR */}
<div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-xl">
  <h2 className="text-2xl font-bold mb-2 text-green-300 text-center">
    OG Dilution Calculator
  </h2>

  <p className="text-center opacity-70 mb-6">
    Calculate your new OG after adding water or other non‑sugar liquids.
  </p>

  <div className="space-y-6">

    {/* Original batch */}
    <div>
      <h3 className="text-xl font-semibold mb-2">Your batch</h3>

      <label htmlFor="og-dilution-original-gravity" className="block mb-1 opacity-80">Original OG</label>
      <input
        id="og-dilution-original-gravity"
        type="text"
        value={ogDilutionOg}
        onChange={(e) => setOgDilutionOg(e.target.value)}
        placeholder="e.g. 1.100"
        className="w-full p-3 rounded bg-black/40 border border-white/20"
      />

      <label htmlFor="og-dilution-volume" className="block mt-4 mb-1 opacity-80">Volume (<UnitSymbol kind="volume" />)</label>
      <UnitInput id="og-dilution-volume" kind="volume" value={ogDilutionVol} onValueChange={setOgDilutionVol} placeholder="e.g. 4" className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    {/* Added water */}
    <div>
      <label htmlFor="og-dilution-added-volume" className="block mb-1 opacity-80">Water added (<UnitSymbol kind="volume" />)</label>
      <UnitInput id="og-dilution-added-volume" kind="volume" value={ogDilutionAddedVol} onValueChange={setOgDilutionAddedVol} placeholder="e.g. 1" className="w-full p-3 rounded bg-black/40 border border-white/20" />
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
        New OG: {ogDilutionResult?.toFixed(3)} SG
      </p>
    </CalculatorResult>
  </div>
</div>

<div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-xl">
  <h2 className="text-2xl font-bold mb-2 text-green-300 text-center">
    Sugar & Honey ABV Calculator
  </h2>

  <p className="text-center opacity-70 mb-6">
    Enter final batch volume and desired ABV to calculate the sugar or honey needed (46 PPG sugar, 35 PPG honey, fermenting out to 1.000).
  </p>

  {/* Toggle */}
  <div className="flex justify-center gap-4 mb-6">
    <button
      type="button"
      onClick={() => setAbvMode("sugar")}
      aria-pressed={abvMode === "sugar"}
      className={`px-4 py-2 rounded-lg border ${
        abvMode === "sugar"
          ? "bg-green-600 border-green-400"
          : "bg-black/40 border-white/20"
      }`}
    >
      Sugar
    </button>

    <button
      type="button"
      onClick={() => setAbvMode("honey")}
      aria-pressed={abvMode === "honey"}
      className={`px-4 py-2 rounded-lg border ${
        abvMode === "honey"
          ? "bg-yellow-600 border-yellow-400"
          : "bg-black/40 border-white/20"
      }`}
    >
      Honey
    </button>
  </div>

  <div className="space-y-6">
    <div>
      <label htmlFor="fermentable-batch-volume" className="block mb-1 opacity-80">Batch volume (<UnitSymbol kind="volume" />)</label>
      <UnitInput id="fermentable-batch-volume" kind="volume" value={targetAbvVol} onValueChange={setTargetAbvVol} placeholder="e.g. 10" className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    <div>
      <label htmlFor="fermentable-desired-abv" className="block mb-1 opacity-80">Desired ABV (%)</label>
      <input
        id="fermentable-desired-abv"
        type="number"
        value={targetAbvPercent}
        onChange={(e) => setTargetAbvPercent(e.target.value)}
        placeholder="e.g. 12"
        className="w-full p-3 rounded bg-black/40 border border-white/20"
      />
    </div>

    <CalculatorResult
      name="sugar and honey ABV calculator"
      inputs={{ "final batch volume": targetAbvVol, "desired ABV": targetAbvPercent }}
      error={fermentableError}
      hasResult={fermentableNeeded !== null && estimatedOg !== null}
      assumptions="Starting with no other fermentable sugar, using 46 PPG for sugar or 35 PPG for honey, and fermenting completely to FG 1.000. Volume is the final batch volume including fermentables. This is potential ABV, not a guarantee: yeast tolerance, honey composition, and residual sugar affect the outcome."
      onReset={() => { setTargetAbvVol(""); setTargetAbvPercent(""); setAbvMode("sugar"); }}
    >
      <p className="text-center text-xl font-bold">
        {abvMode === "sugar" ? "Sugar" : "Honey"} needed: <Qty kind="kg" value={fermentableNeeded !== null ? fermentableNeeded / 1000 : null} />
      </p>
      <p className="mt-2 text-center text-sm text-white/70">
        Estimated starting gravity: {estimatedOg?.toFixed(3)} SG
      </p>
    </CalculatorResult>
  </div>
</div>

        <BrewDayWaterCalculator />
        <WaterChemistryCalculator />
        <RefractometerCorrectionCalculator />
        <section className="mt-12 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-green-300">
            Using the brewing calculators
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-white/75">
            <p>
              Results update automatically. “Waiting for input” lists missing
              fields; “Check your inputs” explains invalid values or impossible
              combinations. Enter an explicit zero where appropriate. Each
              calculated result includes its assumptions. Reset clears only
              that calculator and restores its default scale or mode; it does
              not delete saved profiles or change your unit preference.
              Refractometer reset restores WCF to 1.04; resetting the optional
              WCF calibration only clears its two sample readings.
            </p>
            <p>
              The ABV calculator accepts specific gravity, Oechsle, Plato,
              Brix, or Balling for OG and FG, and converts those readings to
              specific gravity before estimating alcohol. For typical
              brewing readings Brix, Plato, and Balling are close enough that
              the calculator uses the same approximation for them, and ABV is
              displayed to two decimal places. For a post-fermentation
              refractometer reading, use the refractometer alcohol-correction
              calculator above before entering FG. Other gravity tools use specific-gravity
              values (for example, 1.050). Enter alcohol strength as a
              percentage and volume in the unit shown beside each field; the
              volume unit follows your saved preference when signed in or your
              local setting when signed out.
            </p>
            <p>
              The gravity ABV estimate uses (OG − FG) × 131.25. Dilution tools
              assume volumes combine directly and alcohol is conserved; the OG
              dilution tool assumes the added liquid contains no fermentable
              sugar. Real mixtures can contract, and fermentation may not reach
              the assumed final gravity.
            </p>
            <p>
              The sugar and honey estimate assumes fermentation to 1.000 and
              uses 46 PPG for sugar and 35 PPG for honey. The entered batch
              volume is the final volume, including the volume displaced by
              fermentables. Ingredient composition and fermentation conditions
              can change actual results, so treat outputs as planning estimates
              and confirm with measurements.
            </p>
            <p>
              The all-grain water planner estimates mash, sparge, total, and
              pre-boil water from your target fermenter volume and measured
              equipment settings. Its saved equipment profiles store boil-off,
              kettle loss, grain absorption, mash ratio, and tun dead space.
              Measure these on your own setup and refine them over several
              brews; the estimate assumes a single-infusion mash and does not
              include top-up water or decoction.
            </p>
            <p>
              The water chemistry planner uses a water report and a starting
              target ion profile to estimate mineral additions for the entered
              water volume. You can save named profiles containing both your
              source-water report and target ions for reuse. Check your
              supplier&apos;s latest report or use a certified lab for well
              water. Salt combinations affect multiple ions, so review the
              predicted values rather than expecting every target to match
              exactly. The acid estimate only approximates alkalinity
              neutralization; it does not predict mash pH. Treat additions as
              a starting point, follow product instructions, and verify with
              measurements.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
