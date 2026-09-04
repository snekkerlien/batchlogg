"use client";

import { useState } from "react";
import { useInventory } from "./useInventory";

export default function AddItemForm({ onSubmitComplete }: { onSubmitComplete?: () => void }) {
  const { addItem } = useInventory();

  const [form, setForm] = useState({
    name: "",
    category: "honey",
    amount: "",
    unit: "kg",
    minimum_amount: "",
  });

  async function handleSubmit(e: any) {
    e.preventDefault();

    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) =>
      fd.set(key, value.toString())
    );

    await addItem(fd);

    if (onSubmitComplete) onSubmitComplete();
  }

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
        <option value="honey">Honey</option>
        <option value="fermentables">Fermentables</option>
        <option value="fruit">Fruit</option>
        <option value="yeast">Yeast</option>
        <option value="nutrients">Nutrients</option>
        <option value="additives">Additives</option>
        <option value="bottling">Bottling</option>
        <option value="equipment">Equipment</option>
        <option value="cleaning">Cleaning</option>
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
