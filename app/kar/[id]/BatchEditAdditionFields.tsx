"use client";

import { useState } from "react";
import RecipeAdditiveFields from "@/app/my-recipes/new/RecipeAdditiveFields";

export function BatchEditAdditiveFields({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <div>
      <label className="block mb-2 font-semibold">Additives</label>
      <RecipeAdditiveFields defaultValue={defaultValue} />
    </div>
  );
}

type FruitRow = {
  name: string;
  amount: string;
  unit: string;
};

export function BatchEditFruitFields({ defaultValue = [] }: { defaultValue?: FruitRow[] }) {
  const [fruits, setFruits] = useState<FruitRow[]>(() =>
    defaultValue.map((fruit) => ({
      name: fruit.name ?? "",
      amount: String(fruit.amount ?? ""),
      unit: fruit.unit ?? "",
    }))
  );

  function updateFruit(index: number, changes: Partial<FruitRow>) {
    setFruits((current) =>
      current.map((fruit, fruitIndex) =>
        fruitIndex === index ? { ...fruit, ...changes } : fruit
      )
    );
  }

  return (
    <div>
      <label className="block mb-2 font-semibold">Fruit additions</label>
      <div className="space-y-2">
        <input type="hidden" name="fruits_json" value={JSON.stringify(fruits)} />
        {fruits.map((fruit, index) => (
          <div
            key={index}
            className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(6rem,0.35fr)_minmax(5rem,0.25fr)_auto]"
          >
            <input
              aria-label={`Fruit ${index + 1}`}
              placeholder="Fruit (e.g. Mango, Raspberry)"
              value={fruit.name}
              onChange={(event) => updateFruit(index, { name: event.target.value })}
              className="col-span-2 min-w-0 rounded border border-white/20 bg-black/40 p-3 sm:col-span-1"
            />
            <input
              aria-label={`Fruit ${index + 1} amount`}
              placeholder="Amount"
              type="number"
              min="0"
              step="any"
              value={fruit.amount}
              onChange={(event) => updateFruit(index, { amount: event.target.value })}
              className="min-w-0 rounded border border-white/20 bg-black/40 p-3"
            />
            <input
              aria-label={`Fruit ${index + 1} unit`}
              placeholder="Unit"
              value={fruit.unit}
              onChange={(event) => updateFruit(index, { unit: event.target.value })}
              className="min-w-0 rounded border border-white/20 bg-black/40 p-3"
            />
            <button
              type="button"
              onClick={() =>
                setFruits((current) =>
                  current.filter((_, fruitIndex) => fruitIndex !== index)
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
            setFruits((current) => [
              ...current,
              { name: "", amount: "", unit: "" },
            ])
          }
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
        >
          + Add fruit
        </button>
      </div>
    </div>
  );
}
