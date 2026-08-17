"use client";
import { useState } from "react";

export function VolumeSelector() {
  const [value, setValue] = useState(20); // default volum

  const adjust = (amount: number) => {
    setValue((v) => Math.max(0, v + amount)); // hindrer negative tall
  };

  return (
    <div className="w-full text-center">
      <label className="block mb-2 text-center">Batchstørrelse (liter)</label>

      {/* Grid som fungerer perfekt på mobil */}
      <div className="grid grid-cols-3 gap-2 place-items-center mb-3">

        {/* Minus-knapper */}
        <button
          type="button"
          onClick={() => adjust(-10)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded w-full"
        >
          -10
        </button>
        <button
          type="button"
          onClick={() => adjust(-5)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded w-full"
        >
          -5
        </button>
        <button
          type="button"
          onClick={() => adjust(-1)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded w-full"
        >
          -1
        </button>

        {/* Volum-display i midten */}
        <span className="px-4 py-2 bg-zinc-800 rounded border border-zinc-700 font-semibold w-full text-center col-span-3">
          {value} L
        </span>

        {/* Pluss-knapper */}
        <button
          type="button"
          onClick={() => adjust(1)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded w-full"
        >
          +1
        </button>
        <button
          type="button"
          onClick={() => adjust(5)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded w-full"
        >
          +5
        </button>
        <button
          type="button"
          onClick={() => adjust(10)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded w-full"
        >
          +10
        </button>
      </div>

      {/* Hidden input som sendes til server action */}
      <input type="hidden" name="volume_l" value={value} />
    </div>
  );
}
