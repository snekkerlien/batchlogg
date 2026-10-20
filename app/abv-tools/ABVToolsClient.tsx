"use client";

import { useState, useEffect } from "react";
import PageHeading from "@/app/components/PageHeading";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import BrewDayWaterCalculator from "./BrewDayWaterCalculator";
import RefractometerCorrectionCalculator from "./RefractometerCorrectionCalculator";
import WaterChemistryCalculator from "./WaterChemistryCalculator";
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
  const [abv, setAbv] = useState<number | null>(null);
  const [specificGravityReadings, setSpecificGravityReadings] = useState<{
    original: number;
    final: number;
  } | null>(null);

  // ⭐ Blend/Fortify states
  const [dilutionAbv, setDilutionAbv] = useState("");
  const [dilutionVol, setDilutionVol] = useState("");
  const [dilutionAddedVol, setDilutionAddedVol] = useState("");
  const [dilutionResult, setDilutionResult] = useState<number | null>(null);


  // ⭐ Target ABV states
  const [targetBatchAbv, setTargetBatchAbv] = useState("");
  const [targetBatchVol, setTargetBatchVol] = useState("");
  const [targetAddAbv, setTargetAddAbv] = useState("");
  const [targetDesiredAbv, setTargetDesiredAbv] = useState("");
  const [targetResult, setTargetResult] = useState<number | null>(null);

  // ⭐ OG Dilution states
const [ogDilutionOg, setOgDilutionOg] = useState("");
const [ogDilutionVol, setOgDilutionVol] = useState("");
const [ogDilutionAddedVol, setOgDilutionAddedVol] = useState("");
const [ogDilutionResult, setOgDilutionResult] = useState<number | null>(null);

const [targetAbvVol, setTargetAbvVol] = useState("");
const [targetAbvPercent, setTargetAbvPercent] = useState("");
const [sugarNeeded, setSugarNeeded] = useState<number | null>(null);
const [honeyNeeded, setHoneyNeeded] = useState<number | null>(null);
const [abvMode, setAbvMode] = useState<"sugar" | "honey">("sugar");
const gravityScales: { value: GravityScale; label: string }[] = [
  { value: "sg", label: "Specific Gravity" },
  { value: "oechsle", label: "Oechsle" },
  { value: "plato", label: "Plato" },
  { value: "brix", label: "Brix" },
  { value: "balling", label: "Balling" },
];

useEffect(() => {
  const volume = Number.parseFloat(targetAbvVol);
  const abvTarget = Number.parseFloat(targetAbvPercent);
  const grams = calculateFermentableForAbv(volume, abvTarget, abvMode);
  setSugarNeeded(abvMode === "sugar" ? grams : null);
  setHoneyNeeded(abvMode === "honey" ? grams : null);
}, [targetAbvVol, targetAbvPercent, abvMode]);



  // ⭐ Live ABV calculation
  useEffect(() => {
    const ogValue = Number(og.replace(",", "."));
    const fgValue = Number(fg.replace(",", "."));
    const ogNum =
      og.trim() === ""
        ? null
        : convertGravityToSpecificGravity(ogValue, gravityScale);
    const fgNum =
      fg.trim() === ""
        ? null
        : convertGravityToSpecificGravity(fgValue, gravityScale);

    if (ogNum === null || fgNum === null) {
      setAbv(null);
      setSpecificGravityReadings(null);
      return;
    }
    setAbv(calculateAbvFromGravity(ogNum, fgNum));
    setSpecificGravityReadings({ original: ogNum, final: fgNum });
  }, [og, fg, gravityScale]);

  // ⭐ Live Blend/Fortify calculation
  useEffect(() => {
  const A1 = parseFloat(dilutionAbv);
  const V1 = parseFloat(dilutionVol);
  const V2 = parseFloat(dilutionAddedVol);

  setDilutionResult(calculateDilutedAbv(A1, V1, V2));
}, [dilutionAbv, dilutionVol, dilutionAddedVol]);

  // ⭐ Live Target ABV calculation
  useEffect(() => {
    const A1 = parseFloat(targetBatchAbv);
    const V1 = parseFloat(targetBatchVol);
    const A2 = parseFloat(targetAddAbv);
    const AT = parseFloat(targetDesiredAbv);

    setTargetResult(calculateVolumeForTargetAbv(A1, V1, A2, AT));
  }, [targetBatchAbv, targetBatchVol, targetAddAbv, targetDesiredAbv]);

  // ⭐ Live OG Dilution calculation
useEffect(() => {
  const OG1 = parseFloat(ogDilutionOg);
  const V1 = parseFloat(ogDilutionVol);
  const V2 = parseFloat(ogDilutionAddedVol);

  setOgDilutionResult(calculateDilutedGravity(OG1, V1, V2));
}, [ogDilutionOg, ogDilutionVol, ogDilutionAddedVol]);


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

            {abv !== null && (
              <div className="mt-4 text-center">
                <p className="text-xl font-bold">ABV: {abv.toFixed(2)}%</p>
                {specificGravityReadings && (
                  <p className="mt-1 text-sm text-white/55">
                    Converted to SG: OG{" "}
                    {specificGravityReadings.original.toFixed(3)}, FG{" "}
                    {specificGravityReadings.final.toFixed(3)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ⭐ DILUTION CALCULATOR */}
<div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-xl">
  <h2 className="text-2xl font-bold mb-2 text-green-300 text-center">
  Dilution Calculator
</h2>
<p className="text-center opacity-70 mb-6">
  Find your new ABV after adding juice or other liquids
</p>


  <div className="space-y-6">

    {/* Your batch */}
    <div>
      <h3 className="text-xl font-semibold mb-2">Your batch</h3>

      <label className="block mb-1 opacity-80">Current ABV (%)</label>
      <input
        type="text"
        value={dilutionAbv}
        onChange={(e) => setDilutionAbv(e.target.value)}
        placeholder="e.g. 10"
        className="w-full p-3 rounded bg-black/40 border border-white/20"
      />

      <label className="block mt-4 mb-1 opacity-80">Volume (<UnitSymbol kind="volume" />)</label>
      <UnitInput kind="volume" value={dilutionVol} onValueChange={setDilutionVol} placeholder="e.g. 20" className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    {/* Added volume */}
    <div>
      <label className="block mb-1 opacity-80">Volume added (<UnitSymbol kind="volume" />)</label>
      <UnitInput kind="volume" value={dilutionAddedVol} onValueChange={setDilutionAddedVol} placeholder="e.g. 5" className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    {/* Result */}
    {dilutionResult !== null && (
      <p className="text-center text-xl font-bold mt-4">
        New ABV: {dilutionResult.toFixed(2)}%
      </p>
    )}
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

              <label className="block mb-1 opacity-80">Current ABV (%)</label>
              <input
                type="text"
                value={targetBatchAbv}
                onChange={(e) => setTargetBatchAbv(e.target.value)}
                placeholder="e.g. 10"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />

              <label className="block mt-4 mb-1 opacity-80">Volume (<UnitSymbol kind="volume" />)</label>
              <UnitInput kind="volume" value={targetBatchVol} onValueChange={setTargetBatchVol} placeholder="e.g. 20" className="w-full p-3 rounded bg-black/40 border border-white/20" />
            </div>

            {/* Addition ABV */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Addition</h3>

              <label className="block mb-1 opacity-80">ABV (%)</label>
              <input
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

              <label className="block mb-1 opacity-80">Target ABV (%)</label>
              <input
                type="number"
                value={targetDesiredAbv}
                onChange={(e) => setTargetDesiredAbv(e.target.value)}
                placeholder="Desired ABV you want to achieve (e.g. 20)"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />
            </div>

            {/* Result */}
            {targetResult !== null && (
              <p className="text-center text-xl font-bold mt-4">
                Required addition: <Qty kind="volume" value={targetResult} />
              </p>
            )}
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

      <label className="block mb-1 opacity-80">Original OG</label>
      <input
        type="text"
        value={ogDilutionOg}
        onChange={(e) => setOgDilutionOg(e.target.value)}
        placeholder="e.g. 1.100"
        className="w-full p-3 rounded bg-black/40 border border-white/20"
      />

      <label className="block mt-4 mb-1 opacity-80">Volume (<UnitSymbol kind="volume" />)</label>
      <UnitInput kind="volume" value={ogDilutionVol} onValueChange={setOgDilutionVol} placeholder="e.g. 4" className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    {/* Added water */}
    <div>
      <label className="block mb-1 opacity-80">Water added (<UnitSymbol kind="volume" />)</label>
      <UnitInput kind="volume" value={ogDilutionAddedVol} onValueChange={setOgDilutionAddedVol} placeholder="e.g. 1" className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    {/* Result */}
    {ogDilutionResult !== null && (
      <p className="text-center text-xl font-bold mt-4">
        New OG: {ogDilutionResult.toFixed(3)}
      </p>
    )}
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
      <label className="block mb-1 opacity-80">Batch volume (<UnitSymbol kind="volume" />)</label>
      <UnitInput kind="volume" value={targetAbvVol} onValueChange={setTargetAbvVol} placeholder="e.g. 10" className="w-full p-3 rounded bg-black/40 border border-white/20" />
    </div>

    <div>
      <label className="block mb-1 opacity-80">Desired ABV (%)</label>
      <input
        type="number"
        value={targetAbvPercent}
        onChange={(e) => setTargetAbvPercent(e.target.value)}
        placeholder="e.g. 12"
        className="w-full p-3 rounded bg-black/40 border border-white/20"
      />
    </div>

    {sugarNeeded !== null && (
      <p className="text-center text-xl font-bold mt-4">
        Sugar needed: <Qty kind="kg" value={sugarNeeded / 1000} />
      </p>
    )}

    {(sugarNeeded !== null || honeyNeeded !== null) && calculateOgForAbv(Number.parseFloat(targetAbvPercent)) !== null && (
      <p className="text-center text-sm opacity-70">
        Estimated starting gravity: {calculateOgForAbv(Number.parseFloat(targetAbvPercent))!.toFixed(3)}
      </p>
    )}

    {honeyNeeded !== null && (
      <p className="text-center text-xl font-bold mt-4">
        Honey needed: <Qty kind="kg" value={honeyNeeded / 1000} />
      </p>
    )}
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
