"use client";

import { useState } from "react";
import {
  formatRecipeAdditions,
  parseRecipeAdditions,
  type AdditionItem,
} from "@/lib/recipes/additions";

export default function RecipeAdditiveFields({
  fieldName = "additives",
  itemLabel = "Additive",
  defaultValue = "",
}: {
  fieldName?: string;
  itemLabel?: string;
  defaultValue?: string;
}) {
  const [additives, setAdditives] = useState<AdditionItem[]>(() =>
    parseRecipeAdditions(defaultValue)
  );
  const additiveText = formatRecipeAdditions(additives);

  function updateAdditive(index: number, changes: Partial<AdditionItem>) {
    setAdditives((current) =>
      current.map((additive, additiveIndex) =>
        additiveIndex === index ? { ...additive, ...changes } : additive
      )
    );
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={fieldName} value={additiveText} />
      {additives.map((additive, index) => (
        <div
          key={index}
          className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(6rem,0.35fr)_minmax(5rem,0.25fr)_auto]"
        >
          <input
            aria-label={`${itemLabel} ${index + 1}`}
            placeholder={`${itemLabel} name`}
            value={additive.name}
            onChange={(event) => updateAdditive(index, { name: event.target.value })}
            className="col-span-2 min-w-0 rounded border border-white/20 bg-black/40 p-3 sm:col-span-1"
          />
          <input
            aria-label={`${itemLabel} ${index + 1} amount`}
            placeholder="Amount"
            type="number"
            min="0"
            step="any"
            value={additive.amount}
            onChange={(event) => updateAdditive(index, { amount: event.target.value })}
            className="min-w-0 rounded border border-white/20 bg-black/40 p-3"
          />
          <input
            aria-label={`${itemLabel} ${index + 1} unit`}
            placeholder="Unit"
            value={additive.unit}
            onChange={(event) => updateAdditive(index, { unit: event.target.value })}
            className="min-w-0 rounded border border-white/20 bg-black/40 p-3"
          />
          <button
            type="button"
            onClick={() =>
              setAdditives((current) =>
                current.filter((_, additiveIndex) => additiveIndex !== index)
              )
            }
            className="col-span-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 sm:col-span-1"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setAdditives((current) => [
            ...current,
            { name: "", amount: "", unit: "" },
          ])
        }
        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
      >
        + Add {itemLabel.toLowerCase()}
      </button>
    </div>
  );
}
