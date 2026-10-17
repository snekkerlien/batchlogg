"use client";

import { useState } from "react";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

type Calculator = "water" | "dilution" | "priming" | "scaling";

function NumberField({
  label,
  value,
  onChange,
  min = "0",
  step = "any",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block text-sm text-white/75">
      {label}
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
      />
    </label>
  );
}

export default function CalculatorClient() {
  const [calculator, setCalculator] = useState<Calculator>("water");
  const [waterLiters, setWaterLiters] = useState("20");
  const [gypsum, setGypsum] = useState("0");
  const [calciumChloride, setCalciumChloride] = useState("0");
  const [epsomSalt, setEpsomSalt] = useState("0");
  const [bakingSoda, setBakingSoda] = useState("0");
  const [blendVolume, setBlendVolume] = useState("20");
  const [startingAbv, setStartingAbv] = useState("8");
  const [targetAbv, setTargetAbv] = useState("5");
  const [co2Volumes, setCo2Volumes] = useState("2.4");
  const [fermentationTemp, setFermentationTemp] = useState("20");
  const [sugarType, setSugarType] = useState("sucrose");
  const [sourceBatchSize, setSourceBatchSize] = useState("20");
  const [targetBatchSize, setTargetBatchSize] = useState("20");
  const [ingredientAmount, setIngredientAmount] = useState("1000");
  const number = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const gallons = Math.max(number(waterLiters) / 3.78541, 0);
  const dilutionWater =
    number(targetAbv) > 0
      ? Math.max(0, number(blendVolume) * (number(startingAbv) / number(targetAbv) - 1))
      : null;
  const residualCo2 = Math.max(
    0,
    3.0378 - 0.050062 * number(fermentationTemp) + 0.00026555 * number(fermentationTemp) ** 2
  );
  const primingSugar =
    Math.max(0, number(co2Volumes) - residualCo2) *
    number(blendVolume) *
    (sugarType === "dextrose" ? 4.4 : 4);
  const scaleFactor =
    number(sourceBatchSize) > 0 ? number(targetBatchSize) / number(sourceBatchSize) : 0;

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto max-w-4xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-8">
        <div className="absolute left-4 top-3"><BackButton /></div>
        <div className="absolute right-4 top-3"><MenuOverlay current="calculators" /></div>
        <PageHeading title="Advanced brew calculators" subtitle="Planning estimates for water, blending, carbonation, and recipe scaling." />
        <nav aria-label="Calculator" className="mb-6 flex flex-wrap justify-center gap-2">
          {([
            ["water", "Water salts"],
            ["dilution", "Dilution"],
            ["priming", "Priming sugar"],
            ["scaling", "Recipe scaling"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setCalculator(id)}
              aria-pressed={calculator === id}
              className={`rounded-lg border px-3 py-2 text-sm ${calculator === id ? "border-green-400 bg-green-700" : "border-white/15 bg-white/5 hover:bg-white/10"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {calculator === "water" && (
          <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <p className="text-sm text-white/60">Enter grams of each salt for the total water volume. Estimates use standard salt hydration forms and show the approximate ion increase.</p>
            <NumberField label="Water volume (L)" value={waterLiters} onChange={setWaterLiters} min="0.1" />
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Gypsum (CaSO₄·2H₂O), g" value={gypsum} onChange={setGypsum} />
              <NumberField label="Calcium chloride dihydrate (CaCl₂·2H₂O), g" value={calciumChloride} onChange={setCalciumChloride} />
              <NumberField label="Epsom salt (MgSO₄·7H₂O), g" value={epsomSalt} onChange={setEpsomSalt} />
              <NumberField label="Baking soda (NaHCO₃), g" value={bakingSoda} onChange={setBakingSoda} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <Ion label="Calcium" value={(gypsum ? number(gypsum) * 61.5 : 0) + number(calciumChloride) * 27.3} gallons={gallons} />
              <Ion label="Chloride" value={number(calciumChloride) * 48.2} gallons={gallons} />
              <Ion label="Sulfate" value={number(gypsum) * 147.4 + number(epsomSalt) * 103} gallons={gallons} />
              <Ion label="Sodium" value={number(bakingSoda) * 72.3} gallons={gallons} />
            </div>
          </section>
        )}

        {calculator === "dilution" && (
          <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <p className="text-sm text-white/60">Assumes dilution with water and no volume loss.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField label="Current volume (L)" value={blendVolume} onChange={setBlendVolume} min="0.1" />
              <NumberField label="Current ABV (%)" value={startingAbv} onChange={setStartingAbv} min="0.1" />
              <NumberField label="Target ABV (%)" value={targetAbv} onChange={setTargetAbv} min="0.1" />
            </div>
            <Result label="Water to add" value={dilutionWater === null ? "Enter a target ABV" : `${dilutionWater.toFixed(2)} L`} />
          </section>
        )}

        {calculator === "priming" && (
          <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <p className="text-sm text-white/60">Estimated carbonation dose. Residual CO₂ is estimated from the beer’s highest fermentation temperature.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Batch volume (L)" value={blendVolume} onChange={setBlendVolume} min="0.1" />
              <NumberField label="Target carbonation (volumes CO₂)" value={co2Volumes} onChange={setCo2Volumes} min="0" step="0.1" />
              <NumberField label="Highest fermentation temperature (°C)" value={fermentationTemp} onChange={setFermentationTemp} min="0" step="0.1" />
              <label className="block text-sm text-white/75">
                Sugar
                <select value={sugarType} onChange={(event) => setSugarType(event.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white">
                  <option value="sucrose">Sucrose / table sugar</option>
                  <option value="dextrose">Dextrose</option>
                </select>
              </label>
            </div>
            <Result label={`Estimated ${sugarType === "dextrose" ? "dextrose" : "sucrose"} required`} value={`${primingSugar.toFixed(1)} g`} />
          </section>
        )}

        {calculator === "scaling" && (
          <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <p className="text-sm text-white/60">Scale any recipe ingredient by the ratio between the target and original batch size.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField label="Original batch size (L)" value={sourceBatchSize} onChange={setSourceBatchSize} min="0.1" />
              <NumberField label="Target batch size (L)" value={targetBatchSize} onChange={setTargetBatchSize} min="0.1" />
              <NumberField label="Original ingredient amount (any unit)" value={ingredientAmount} onChange={setIngredientAmount} min="0" />
            </div>
            <Result label={`Scale factor ${scaleFactor.toFixed(3)}×`} value={(number(ingredientAmount) * scaleFactor).toFixed(2)} />
          </section>
        )}
      </div>
    </main>
  );
}

function Ion({ label, value, gallons }: { label: string; value: number; gallons: number }) {
  return (
    <div className="rounded-lg bg-black/30 p-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 font-semibold text-green-200">{gallons > 0 ? (value / gallons).toFixed(0) : "0"} ppm</p>
    </div>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-green-400/20 bg-green-500/10 p-4 text-center">
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-green-200">{value}</p>
    </div>
  );
}
