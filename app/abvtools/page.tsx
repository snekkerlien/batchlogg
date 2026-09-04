"use client";

import { useState, useEffect } from "react";
import BackButton from "./BackButton";
import MenuOverlay from "./MenuOverlay";

export default function ABVCalculatorPage() {
  const [og, setOg] = useState("");
  const [fg, setFg] = useState("");
  const [abv, setAbv] = useState<number | null>(null);

  // ⭐ Blend/Fortify states
  const [batchAbv, setBatchAbv] = useState("");
  const [batchVol, setBatchVol] = useState("");
  const [addAbv, setAddAbv] = useState("");
  const [addVol, setAddVol] = useState("");
  const [newAbv, setNewAbv] = useState<number | null>(null);

  // ⭐ Target ABV states
  const [targetBatchAbv, setTargetBatchAbv] = useState("");
  const [targetBatchVol, setTargetBatchVol] = useState("");
  const [targetAddAbv, setTargetAddAbv] = useState("");
  const [targetDesiredAbv, setTargetDesiredAbv] = useState("");
  const [targetResult, setTargetResult] = useState<number | null>(null);

  // ⭐ Live ABV calculation
  useEffect(() => {
    const ogNum = parseFloat(og);
    const fgNum = parseFloat(fg);

    if (!isNaN(ogNum) && !isNaN(fgNum)) {
      const result = (ogNum - fgNum) * 131.25;
      setAbv(result);
    } else {
      setAbv(null);
    }
  }, [og, fg]);

  // ⭐ Live Blend/Fortify calculation
  useEffect(() => {
    const A1 = parseFloat(batchAbv);
    const V1 = parseFloat(batchVol);
    const A2 = parseFloat(addAbv);
    const V2 = parseFloat(addVol);

    if (!isNaN(A1) && !isNaN(V1) && !isNaN(A2) && !isNaN(V2)) {
      const result = ((A1 * V1) + (A2 * V2)) / (V1 + V2);
      setNewAbv(result);
    } else {
      setNewAbv(null);
    }
  }, [batchAbv, batchVol, addAbv, addVol]);

  // ⭐ Live Target ABV calculation
  useEffect(() => {
    const A1 = parseFloat(targetBatchAbv);
    const V1 = parseFloat(targetBatchVol);
    const A2 = parseFloat(targetAddAbv);
    const AT = parseFloat(targetDesiredAbv);

    if (!isNaN(A1) && !isNaN(V1) && !isNaN(A2) && !isNaN(AT)) {
      const V2 = (V1 * (AT - A1)) / (A2 - AT);
      setTargetResult(V2 > 0 ? V2 : null);
    } else {
      setTargetResult(null);
    }
  }, [targetBatchAbv, targetBatchVol, targetAddAbv, targetDesiredAbv]);

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-4xl border border-white/10 relative pt-16 sm:pt-0">

        {/* ⭐ TOP BAR */}
        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay />
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center mt-6">
          ABV Tools
        </h1>

        {/* ⭐ ABV CALCULATOR — MATCHER DE ANDRE SEKSJONENE */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
          <h2 className="text-2xl font-bold mb-6 text-green-300 text-center">
            ABV Calculator
          </h2>

          <div className="space-y-6">

            <div>
              <label className="block mb-1 opacity-80">Original Gravity (OG)</label>
              <input
                value={og}
                onChange={(e) => setOg(e.target.value)}
                placeholder="e.g. 1.100"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />
            </div>

            <div>
              <label className="block mb-1 opacity-80">Final Gravity (FG)</label>
              <input
                value={fg}
                onChange={(e) => setFg(e.target.value)}
                placeholder="e.g. 1.000"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />
            </div>

            {abv !== null && (
              <p className="text-center text-xl font-bold mt-4">
                ABV: {abv.toFixed(2)}%
              </p>
            )}
          </div>
        </div>

        {/* ⭐ BLEND & FORTIFY SECTION */}
        <div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-xl">
          <h2 className="text-2xl font-bold mb-6 text-green-300 text-center">
            Blend & Fortify Calculator
          </h2>

          <div className="space-y-6">

            {/* Original batch */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Your batch</h3>

              <label className="block mb-1 opacity-80">ABV (%)</label>
              <input
                type="number"
                value={batchAbv}
                onChange={(e) => setBatchAbv(e.target.value)}
                placeholder="e.g. 10"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />

              <label className="block mt-4 mb-1 opacity-80">Volume (L)</label>
              <input
                type="number"
                value={batchVol}
                onChange={(e) => setBatchVol(e.target.value)}
                placeholder="e.g. 20"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />
            </div>

            {/* Addition */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Addition</h3>

              <label className="block mb-1 opacity-80">ABV (%)</label>
              <input
                type="number"
                value={addAbv}
                onChange={(e) => setAddAbv(e.target.value)}
                placeholder="ABV for your addition of choice (e.g. 0 for juice, 40 for vodka)"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />

              <label className="block mt-4 mb-1 opacity-80">Volume (L)</label>
              <input
                type="number"
                value={addVol}
                onChange={(e) => setAddVol(e.target.value)}
                placeholder="e.g. 1"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />
            </div>

            {/* Result */}
            {newAbv !== null && (
              <p className="text-center text-xl font-bold mt-4">
                New ABV: {newAbv.toFixed(2)}%
              </p>
            )}
          </div>
        </div>

        {/* ⭐ TARGET ABV SECTION */}
        <div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-xl">
          <h2 className="text-2xl font-bold mb-6 text-green-300 text-center">
            Target ABV Calculator
          </h2>

          <div className="space-y-6">

            {/* Current batch */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Your batch</h3>

              <label className="block mb-1 opacity-80">Current ABV (%)</label>
              <input
                type="number"
                value={targetBatchAbv}
                onChange={(e) => setTargetBatchAbv(e.target.value)}
                placeholder="e.g. 10"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />

              <label className="block mt-4 mb-1 opacity-80">Volume (L)</label>
              <input
                type="number"
                value={targetBatchVol}
                onChange={(e) => setTargetBatchVol(e.target.value)}
                placeholder="e.g. 20"
                className="w-full p-3 rounded bg-black/40 border border-white/20"
              />
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
                Required addition: {targetResult.toFixed(2)} L
              </p>
            )}
          </div>
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>
    </main>
  );
}
