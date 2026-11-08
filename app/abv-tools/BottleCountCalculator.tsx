"use client";

import { useState } from "react";
import { Qty, UnitInput, UnitSymbol, useUnits } from "@/app/components/Units";
import { getCalculatorInputError, parseCalculatorNumber } from "@/lib/brewing/calculatorValidation";
import { calculateBottleCount } from "@/lib/brewing/calculators";
import CalculatorResult from "./CalculatorResult";
import CalculatorDisclosure from "./CalculatorDisclosure";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function BottleCountCalculator() {
  const { system } = useUnits();
  const { t } = useTranslation();
  const [batchVolume, setBatchVolume] = useState("");
  const [bottleVolume, setBottleVolume] = useState("");
  const error = getCalculatorInputError([
    { label: "Batch volume", value: batchVolume, positive: true },
    { label: "Bottle size", value: bottleVolume, positive: true },
  ]);
  const result =
    batchVolume.trim() && bottleVolume.trim() && !error
      ? calculateBottleCount(
          parseCalculatorNumber(batchVolume),
          parseCalculatorNumber(bottleVolume)
        )
      : null;

  return (
    <CalculatorDisclosure
      id="bottle-count-calculator"
      title="Bottle-count calculator"
      description="Find how many bottles you can fill and how much volume will remain."
      className="mt-6"
    >
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          {t("Volume ready to bottle")} (<UnitSymbol kind="volume" />)
          <UnitInput
            kind="volume"
            value={batchVolume}
            onValueChange={setBatchVolume}
            min="0"
            placeholder={system === "metric" ? t("e.g. 20") : t("e.g. 5")}
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("Fill volume per bottle")} (<UnitSymbol kind="volume" />)
          <UnitInput
            kind="volume"
            value={bottleVolume}
            onValueChange={setBottleVolume}
            min="0"
            placeholder={system === "metric" ? t("e.g. 0.5") : t("e.g. 0.125")}
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
      </div>
      <CalculatorResult
        name="bottle-count calculator"
        inputs={{ "volume ready to bottle": batchVolume, "bottle size": bottleVolume }}
        error={error}
        hasResult={result !== null}
        assumptions="The batch volume is the liquid available to fill bottles. Bottle size is the amount put into each bottle, including whatever headspace you choose. This estimate does not deduct transfer losses or add extra volume for spills, foam, or overfilling."
        onReset={() => {
          setBatchVolume("");
          setBottleVolume("");
        }}
      >
        <div className="space-y-2 text-center">
          <p className="text-xl font-bold">
            {t("Full bottles")}: {result?.fullBottleCount.toLocaleString()}
          </p>
          <p className="text-sm text-white/75">
            {t("Leftover volume")}: <Qty kind="volume" value={result?.leftoverVolumeL} />
          </p>
        </div>
      </CalculatorResult>
    </CalculatorDisclosure>
  );
}
