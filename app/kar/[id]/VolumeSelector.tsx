"use client";
import { useState } from "react";

export function VolumeSelector() {
  const [value, setValue] = useState(20); // default volum, endre hvis du vil

  const adjust = (amount: number) => {
    setValue((v) => Math.max(0, v + amount)); // hindrer negative tall
  };

  return (
    <div>
      <label className="block mb-1">Batchstørrelse (liter)</label>

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => adjust(-10)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded"
        >
          -10
        </button>
        <button
          type="button"
          onClick={() => adjust(-5)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded"
        >
          -5
        </button>
        <button
          type="button"
          onClick={() => adjust(-1)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded"
        >
          -1
        </button>

        <span className="px-4 py-2 bg-zinc-800 rounded border border-zinc-700 font-semibold">
          {value} L
        </span>

        <button
          type="button"
          onClick={() => adjust(1)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded"
        >
          +1
        </button>
        <button
          type="button"
          onClick={() => adjust(5)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded"
        >
          +5
        </button>
        <button
          type="button"
          onClick={() => adjust(10)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded"
        >
          +10
        </button>
      </div>

      {/* Hidden input som sendes til server action */}
      <input type="hidden" name="volume_l" value={value} />
    </div>
  );
}
