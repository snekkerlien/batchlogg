"use client";

import { useState } from "react";
import { INVENTORY_CATEGORIES, SNUS_CATEGORIES } from "@/lib/inventory/categories";

type AddItemFormProps = {
  onSubmitComplete?: () => void;
  onAddItem: (formData: FormData) => Promise<void>;
  profile: any; // du kan stramme inn senere
};

export default function AddItemForm({
  onSubmitComplete,
  onAddItem,
  profile,
}: AddItemFormProps) {
  const [form, setForm] = useState({
    name: "",
    category: "fermentables",
    subcategory: "",
    amount: "",
    unit: "kg",
    minimum_amount: "",
    alpha_acid: "",
    ebc: "",
    hop_year: "",
  });
  const isHop = form.category === "hops";
  const isMalt = form.category === "malts";

  const visibleCategories =
    profile?.snus_is_true
      ? [...INVENTORY_CATEGORIES, ...SNUS_CATEGORIES.map((id) => ({ id, label: id, subcategories: [] as string[] }))]
      : INVENTORY_CATEGORIES;
  const selectedCategory = INVENTORY_CATEGORIES.find(
    (category) => category.id === form.category
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) =>
      fd.set(key, value.toString())
    );

    await onAddItem(fd);

    onSubmitComplete?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        required
        className="p-3 bg-black/40 border border-white/20 rounded"
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <select
        className="p-3 bg-black/40 border border-white/20 rounded"
        value={form.category}
        onChange={(e) =>
          setForm({ ...form, category: e.target.value, subcategory: "" })
        }
      >
        {visibleCategories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.label}
          </option>
        ))}
      </select>

      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <select
          className="rounded border border-white/20 bg-black/40 p-3"
          value={form.subcategory}
          onChange={(event) =>
            setForm({ ...form, subcategory: event.target.value })
          }
        >
          <option value="">Choose a subcategory</option>
          {selectedCategory.subcategories.map((subcategory) => (
            <option key={subcategory} value={subcategory}>
              {subcategory}
            </option>
          ))}
        </select>
      )}

      <input
        className="p-3 bg-black/40 border border-white/20 rounded"
        placeholder="Amount"
        type="number"
        min="0"
        step="any"
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
        min="0"
        step="any"
        value={form.minimum_amount}
        onChange={(e) =>
          setForm({ ...form, minimum_amount: e.target.value })
        }
      />

      {isHop && (
        <input
          required
          className="p-3 bg-black/40 border border-white/20 rounded"
          placeholder="Alpha acid (%)"
          type="number"
          min="0"
          max="100"
          step="any"
          value={form.alpha_acid}
          onChange={(e) => setForm({ ...form, alpha_acid: e.target.value })}
        />
      )}

      {isHop && (
        <input
          className="p-3 bg-black/40 border border-white/20 rounded"
          placeholder="Harvest year (e.g. 2025)"
          type="number"
          min="1900"
          max="2200"
          step="1"
          value={form.hop_year}
          onChange={(e) => setForm({ ...form, hop_year: e.target.value })}
        />
      )}

      {isMalt && (
        <input
          required
          className="p-3 bg-black/40 border border-white/20 rounded"
          placeholder="Color (EBC)"
          type="number"
          min="0"
          step="any"
          value={form.ebc}
          onChange={(e) => setForm({ ...form, ebc: e.target.value })}
        />
      )}

      <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
        Add item
      </button>
    </form>
  );
}
