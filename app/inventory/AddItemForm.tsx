"use client";

import { useState } from "react";
import FormField from "@/app/components/FormField";
import {
  getInventorySubcategoryOptions,
  INVENTORY_BOTTLE_TYPES,
  INVENTORY_CATEGORIES,
  SNUS_CATEGORIES,
} from "@/lib/inventory/categories";

type AddItemFormProps = {
  onSubmitComplete?: () => void;
  onAddItem: (formData: FormData) => Promise<void>;
  profile: any; // du kan stramme inn senere
  fixedCategory?: string;
};

export default function AddItemForm({
  onSubmitComplete,
  onAddItem,
  profile,
  fixedCategory,
}: AddItemFormProps) {
  const [form, setForm] = useState({
    name: "",
    category: fixedCategory ?? "fermentables",
    subcategory: "",
    bottle_type: "",
    amount: "",
    unit: "kg",
    minimum_amount: "",
    alpha_acid: "",
    ebc: "",
    hop_year: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isHop = form.category === "hops";
  const isMalt = form.category === "malts";
  const isBottle = form.category === "packaging" && form.subcategory === "Bottles";
  const itemType =
    form.category === "malts"
      ? "malt"
      : form.category === "hops"
        ? "hop"
        : form.category === "yeast"
          ? "yeast"
          : "item";

  const visibleCategories =
    profile?.snus_is_true
      ? [...INVENTORY_CATEGORIES, ...SNUS_CATEGORIES.map((id) => ({ id, label: id, subcategories: [] as string[] }))]
      : INVENTORY_CATEGORIES;
  const selectedCategory = INVENTORY_CATEGORIES.find(
    (category) => category.id === form.category
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key !== "bottle_type" || isBottle) {
          fd.set(key, value.toString());
        }
      });

      await onAddItem(fd);

      onSubmitComplete?.();
    } catch (submitError) {
      console.error("Could not add inventory item", submitError);
      setError("Could not add this item. Please check the values and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={saving} className="flex flex-col gap-4">
      <FormField id="inventory-add-name" label={isMalt ? "Malt type" : isHop ? "Hop type" : "Name"} required>
        <input
          id="inventory-add-name"
          required
          disabled={saving}
          className="w-full rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </FormField>

      {fixedCategory ? (
        <input type="hidden" name="category" value={form.category} />
      ) : (
        <FormField id="inventory-add-category" label="Category">
          <select
            id="inventory-add-category"
            disabled={saving}
            className="w-full rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
            value={form.category}
            onChange={(e) =>
              setForm({
                ...form,
                category: e.target.value,
                subcategory: "",
                bottle_type: "",
              })
            }
          >
            {visibleCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </FormField>
      )}

      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <FormField id="inventory-add-subcategory" label="Subcategory">
          <select
            id="inventory-add-subcategory"
            disabled={saving}
            className="w-full rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
            value={form.subcategory}
            onChange={(event) =>
              setForm({
                ...form,
                subcategory: event.target.value,
                bottle_type: "",
                unit: event.target.value === "Bottles" ? "pcs" : form.unit,
              })
            }
          >
            <option value="">Choose a subcategory</option>
            {getInventorySubcategoryOptions(selectedCategory.id).map((subcategory) => (
              <option key={subcategory.value} value={subcategory.value}>
                {subcategory.label}
              </option>
            ))}
          </select>
        </FormField>
      )}

      {isBottle && (
        <FormField id="inventory-add-bottle-type" label="Bottle type" required>
          <select
            id="inventory-add-bottle-type"
            required
            disabled={saving}
            className="w-full rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
            value={form.bottle_type}
            onChange={(event) =>
              setForm({ ...form, bottle_type: event.target.value })
            }
          >
            <option value="">Choose a bottle type</option>
            {INVENTORY_BOTTLE_TYPES.map((bottleType) => (
              <option key={bottleType} value={bottleType}>
                {bottleType}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField id="inventory-add-amount" label="Current stock">
        <input
          id="inventory-add-amount"
          type="number"
          min="0"
          step="any"
          disabled={saving}
          className="w-full rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
      </FormField>

      <FormField id="inventory-add-unit" label="Unit" hint="For example: kg, g, L, or pcs.">
        <input
          id="inventory-add-unit"
          disabled={saving}
          className="w-full rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
        />
      </FormField>

      <FormField id="inventory-add-minimum" label="Minimum amount">
        <input
          id="inventory-add-minimum"
          type="number"
          min="0"
          step="any"
          disabled={saving}
          className="w-full rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
          value={form.minimum_amount}
          onChange={(e) =>
            setForm({ ...form, minimum_amount: e.target.value })
          }
        />
      </FormField>

      {isHop && (
        <FormField id="inventory-add-alpha-acid" label="Alpha acid (%)" required>
          <input
            id="inventory-add-alpha-acid"
            required
            type="number"
            min="0"
            max="100"
            step="any"
            disabled={saving}
            className="w-full rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
            value={form.alpha_acid}
            onChange={(e) => setForm({ ...form, alpha_acid: e.target.value })}
          />
        </FormField>
      )}

      {isHop && (
        <FormField id="inventory-add-hop-year" label="Harvest year">
          <input
            id="inventory-add-hop-year"
            type="number"
            min="1900"
            max="2200"
            step="1"
            disabled={saving}
            className="w-full rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
            value={form.hop_year}
            onChange={(e) => setForm({ ...form, hop_year: e.target.value })}
          />
        </FormField>
      )}

      {isMalt && (
        <FormField id="inventory-add-ebc" label="Color (EBC)" required>
          <input
            id="inventory-add-ebc"
            required
            type="number"
            min="0"
            step="any"
            disabled={saving}
            className="w-full rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
            value={form.ebc}
            onChange={(e) => setForm({ ...form, ebc: e.target.value })}
          />
        </FormField>
      )}

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg border border-green-500 bg-green-700 px-4 py-3 font-semibold hover:bg-green-600 disabled:cursor-wait disabled:opacity-60"
      >
        {saving ? "Adding…" : `Add ${itemType}`}
      </button>
    </form>
  );
}
