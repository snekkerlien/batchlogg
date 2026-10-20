"use client";

import { useState } from "react";
import {
  calculateWortCorrectionFactor,
  calculateRefractometerCorrection,
} from "@/lib/brewing/calculators";

function parseReading(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function RefractometerCorrectionCalculator() {
  const [originalBrix, setOriginalBrix] = useState("");
  const [finalBrix, setFinalBrix] = useState("");
  const [wortCorrectionFactor, setWortCorrectionFactor] = useState("1.04");
  const [calibrationBrix, setCalibrationBrix] = useState("");
  const [calibrationHydrometerSg, setCalibrationHydrometerSg] = useState("");

  const original = parseReading(originalBrix);
  const final = parseReading(finalBrix);
  const correctionFactor = parseReading(wortCorrectionFactor);
  const calibrationFactor =
    calibrationBrix.trim() && calibrationHydrometerSg.trim()
      ? calculateWortCorrectionFactor(
          parseReading(calibrationBrix) ?? Number.NaN,
          parseReading(calibrationHydrometerSg) ?? Number.NaN
        )
      : null;
  const result =
    original !== null && final !== null && correctionFactor !== null
      ? calculateRefractometerCorrection(original, final, correctionFactor)
      : null;
  const hasAllReadings =
    originalBrix.trim() !== "" &&
    finalBrix.trim() !== "" &&
    wortCorrectionFactor.trim() !== "";

  return (
    <section
      id="refractometer-correction"
      className="mt-6 scroll-mt-6 rounded-xl border border-white/10 bg-white/5 p-6"
    >
      <h2 className="mb-2 text-center text-xl font-bold text-green-300">
        Refractometer alcohol correction
      </h2>
      <p className="mb-6 text-center text-sm text-white/70">
        Correct a post-fermentation refractometer reading using the original
        and current Brix values.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Original Brix before fermentation (°Bx)
          <input
            type="number"
            min="0"
            max="35"
            step="any"
            value={originalBrix}
            onChange={(event) => setOriginalBrix(event.target.value)}
            placeholder="e.g. 12.4"
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Current refractometer reading (°Bx)
          <input
            type="number"
            min="0"
            max="35"
            step="any"
            value={finalBrix}
            onChange={(event) => setFinalBrix(event.target.value)}
            placeholder="e.g. 6.0"
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Wort correction factor (WCF)
          <input
            type="number"
            min="0.9"
            max="1.1"
            step="0.0001"
            value={wortCorrectionFactor}
            onChange={(event) => setWortCorrectionFactor(event.target.value)}
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base sm:max-w-xs"
          />
        </label>
      </div>

      <p className="mt-4 text-xs leading-5 text-white/55">
        Use the Brix reading taken before fermentation and your refractometer’s
        current reading. A WCF of 1.04 is a common starting point, but it
        varies by refractometer and wort. Use the calibration below for a
        measured starting value.
      </p>

      <details className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
        <summary className="flex cursor-pointer list-none items-start gap-2 text-sm font-semibold text-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300">
          <span
            aria-hidden="true"
            className="disclosure-arrow mt-0.5 shrink-0 transition-transform"
          >
            &#9656;
          </span>
          <span className="min-w-0">
            Calibrate WCF with an unfermented wort sample
          </span>
        </summary>
        <div className="mt-4 space-y-3">
          <p className="text-xs leading-5 text-white/65">
            Take both readings from the same well-mixed wort sample before
            fermentation. Cool and correct the hydrometer reading for its
            calibration temperature. Recalibrate when switching refractometers
            or when wort composition changes.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Refractometer Brix for calibration
              <input
                type="number"
                min="0.1"
                max="35"
                step="any"
                value={calibrationBrix}
                onChange={(event) => setCalibrationBrix(event.target.value)}
                placeholder="e.g. 12.4"
                className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Hydrometer OG (specific gravity)
              <input
                type="number"
                min="0.8"
                max="1.2"
                step="any"
                value={calibrationHydrometerSg}
                onChange={(event) =>
                  setCalibrationHydrometerSg(event.target.value)
                }
                placeholder="e.g. 1.048"
                className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
              />
            </label>
          </div>
          {calibrationFactor !== null ? (
            <p role="status" className="flex flex-wrap items-center gap-3 text-sm">
              Suggested WCF: <strong>{calibrationFactor.toFixed(4)}</strong>
              <button
                type="button"
                onClick={() =>
                  setWortCorrectionFactor(calibrationFactor.toFixed(4))
                }
                className="rounded-lg border border-green-500 bg-green-700 px-3 py-2 font-semibold hover:bg-green-600"
              >
                Use this WCF
              </button>
            </p>
          ) : calibrationBrix.trim() && calibrationHydrometerSg.trim() ? (
            <p role="alert" className="text-sm text-amber-200">
              Check both calibration readings. They must produce a WCF between
              0.9000 and 1.1000.
            </p>
          ) : null}
        </div>
      </details>

      {result ? (
        <dl className="mt-5 grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <dt className="text-xs uppercase tracking-wide text-white/50">
              Estimated original gravity
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {result.originalGravity.toFixed(3)}
            </dd>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <dt className="text-xs uppercase tracking-wide text-white/50">
              Corrected final gravity
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {result.finalGravity.toFixed(3)}
            </dd>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <dt className="text-xs uppercase tracking-wide text-white/50">
              Estimated ABV
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {result.abv.toFixed(2)}%
            </dd>
          </div>
        </dl>
      ) : hasAllReadings ? (
        <p role="alert" className="mt-5 text-center text-sm text-amber-200">
          Check the readings and correction factor. The readings must be in
          range, and the corrected FG cannot be higher than the estimated OG.
        </p>
      ) : (
        <p className="mt-5 text-center text-sm text-white/50">
          Enter both Brix readings to calculate corrected FG and estimated ABV.
        </p>
      )}
      <p className="mt-4 text-xs leading-5 text-amber-100/70">
        This is an estimate using a published refractometer correction model
        and the standard gravity-difference ABV approximation. For best
        accuracy, confirm FG with a hydrometer.
      </p>
    </section>
  );
}
