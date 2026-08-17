"use client";
import { useState } from "react";

export function VolumeSelector() {
  const [value, setValue] = useState(20);

  const liters = Array.from({ length: 100 }, (_, i) => i + 1); // 1–100 liter

  return (
    <div className="w-full text-center">
      <label className="block mb-2 text-center">Batchstørrelse (liter)</label>

      <select
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 text-center text-lg"
      >
        {liters.map((l) => (
          <option key={l} value={l}>
            {l} liter
          </option>
        ))}
      </select>

      {/* Hidden input som sendes til server action */}
      <input type="hidden" name="volume_l" value={value} />
    </div>
  );
}
