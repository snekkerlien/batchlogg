"use client";

import { useState } from "react";
import { useInventory } from "./useInventory";

type AddItemFormProps = {
  onSubmitComplete?: () => void;
  profile: any; // du kan stramme inn senere
};

export default function AddItemForm({ onSubmitComplete, profile }: AddItemFormProps) {
  const { addItem } = useInventory();

  const [form, setForm] = useState({
    name: "",
    category: "honey",
    amount: "",
    unit: "kg",
    minimum_amount: "",
  });

  const baseCategories = [
    "honey",
    "fermentables",
    "fruit",
    "yeast",
    "nutrients",
    "additives",
    "bottling",
    "equipment",
    "cleaning",
  ];

  const snusCategories = ["snus", "snusessens"];

  const visibleCategories =
    profile?.snus_is_true
      ? [...baseCategories, ...snusCategories]
      : baseCategories;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) =>
      fd.set(key, value.toString())
    );

    await addItem(fd);

    onSubmitComplete?.();
  }

  console.log("PROFILE IN AddItemForm:", profile);


  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        className="p-3 bg-black/40 border border-white/20 rounded"
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <select
        className="p-3 bg-black/40 border border-white/20 rounded"
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
      >
        {visibleCategories.map((cat) => (
          <option key={cat} value={cat}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </option>
        ))}
      </select>

      <input
        className="p-3 bg-black/40 border border-white/20 rounded"
        placeholder="Amount"
        type="number"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
      />

      <input
        className="p-3 bg-black/40 border border-white/20 rounded"
        placeholder="Unit (kg, g, L, pcs, etc.)"
        value={form.unit}
        onChange={(e) => setForm({ ...form, unit: e.target.value })}
      />

      <input
        className="p-3 bg-black/40 border border-white/20 rounded"
        placeholder="Minimum amount"
        type="number"
        value={form.minimum_amount}
        onChange={(e) =>
          setForm({ ...form, minimum_amount: e.target.value })
        }
      />

      <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
        Add item
      </button>
    </form>
  );
}
