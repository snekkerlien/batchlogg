"use client";

import { useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import FormField from "@/app/components/FormField";
import {
  INVENTORY_CATEGORIES,
  getInventoryItemCategory,
  getInventorySubcategoryOptions,
  LEGACY_CATEGORY_ALIASES,
  SNUS_CATEGORIES,
} from "@/lib/inventory/categories";

export default function InventoryItem({
  item,
  profile,
  updateItem,
  deleteItem,
}: {
  item: any;
  profile: any;
  updateItem: (
    id: string,
    name: string,
    category: string,
    subcategory: string,
    amount: number,
    minimumAmount: number
  ) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}) {
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(
    () => getInventoryItemCategory(item.category, item.subcategory).category
  );
  const [subcategory, setSubcategory] = useState(
    () => getInventoryItemCategory(item.category, item.subcategory).subcategory
  );
  const [amount, setAmount] = useState(item.amount);
  const [minimumAmount, setMinimumAmount] = useState(item.minimum_amount ?? "");
  const snusCategories = ["snus", "snusessens"];
  const visibleCategories: {
    id: string;
    label: string;
    subcategories: readonly string[];
  }[] = profile?.snus_is_true
    ? [
        ...INVENTORY_CATEGORIES,
        ...SNUS_CATEGORIES.map((id) => ({ id, label: id, subcategories: [] })),
      ]
    : [...INVENTORY_CATEGORIES];
  const categoryIsListed = visibleCategories.some(
    (itemCategory) => itemCategory.id === category
  );
  if (
    !categoryIsListed &&
    Object.prototype.hasOwnProperty.call(LEGACY_CATEGORY_ALIASES, category)
  ) {
    visibleCategories.push({
      id: category,
      label: category,
      subcategories: [],
    });
  }
  const selectedCategory = INVENTORY_CATEGORIES.find(
    (itemCategory) =>
      itemCategory.id ===
      (LEGACY_CATEGORY_ALIASES[category] ?? category)
  );
  const minimum = Number(item.minimum_amount);
  const current = Number(item.amount);
  const itemCategory = getInventoryItemCategory(item.category, item.subcategory);

  let status = "OK";
  let statusColor = "text-green-400";

  if (current <= 0) {
    status = "Empty";
    statusColor = "text-red-500";
  } else if (current <= minimum) {
    status = "Low";
    statusColor = "text-yellow-400";
  }

  function startEdit() {
    setName(item.name);
    setCategory(itemCategory.category);
    setSubcategory(itemCategory.subcategory);
    setAmount(item.amount);
    setMinimumAmount(item.minimum_amount ?? "");
    setEditError("");
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setName(item.name);
    setCategory(itemCategory.category);
    setSubcategory(itemCategory.subcategory);
    setAmount(item.amount);
    setMinimumAmount(item.minimum_amount ?? "");
    setEditError("");
  }

  async function confirmEdit() {
    setSaving(true);
    setEditError("");
    try {
      await updateItem(
        item.id,
        name,
        category,
        subcategory,
        Number(amount),
        Number(minimumAmount)
      );
      setEditMode(false);
    } catch (error) {
      console.error("Could not update inventory item", error);
      setEditError("Could not update this item. Check the values and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteInventoryItemConfirmed() {
    try {
      await deleteItem(item.id);
      return true;
    } catch (error) {
      console.error("Could not delete inventory item", error);
      setDeleteError("Could not delete this item. Please try again.");
      return false;
    }
  }

  return (
    <div className="flex min-h-48 flex-col justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900 p-4 shadow">
      <div>
        <div className="flex items-start justify-between">
          <h3 className="line-clamp-2 text-base font-semibold leading-tight">
            {item.name}
          </h3>
          {profile?.snus_is_true && snusCategories.includes(item.category) && (
            <span className="rounded-md border border-purple-500 bg-purple-700 px-2 py-1 text-xs">
              Snus
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-white/60">
          {itemCategory.subcategory
            ? `${INVENTORY_CATEGORIES.find((category) => category.id === itemCategory.category)?.label ?? itemCategory.category} · ${itemCategory.subcategory}`
            : INVENTORY_CATEGORIES.find((category) => category.id === itemCategory.category)?.label ?? itemCategory.category}
        </div>
        {item.category === "hops" && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {item.alpha_acid != null && item.alpha_acid !== "" && (
              <span className="rounded-md border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-amber-100">
                {Number(item.alpha_acid)}%
              </span>
            )}
            {item.hop_year != null && item.hop_year !== "" && (
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                {item.hop_year}
              </span>
            )}
          </div>
        )}
        {item.category === "malts" && item.ebc != null && item.ebc !== "" && (
          <div className="mt-2">
            <span className="rounded-md border border-orange-300/20 bg-orange-300/10 px-2 py-1 text-xs text-orange-100">
              EBC {Number(item.ebc).toFixed(0)}
            </span>
          </div>
        )}
      </div>

      {!editMode && (
        <div className="mt-1 flex items-center justify-between">
          <p className="text-lg font-bold">
            {item.amount} {item.unit}
          </p>
          <span className={`font-semibold ${statusColor}`}>{status}</span>
        </div>
      )}

      {editMode && (
        <div aria-busy={saving} className="mt-1 flex flex-col gap-3">
          <FormField id={`inventory-edit-${item.id}-name`} label="Name" required>
            <input
              id={`inventory-edit-${item.id}-name`}
              required
              disabled={saving}
              className="w-full rounded border border-white/20 bg-black/40 p-2 text-base focus:border-green-400 focus:outline-none"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>
          <FormField id={`inventory-edit-${item.id}-category`} label="Category">
            <select
              id={`inventory-edit-${item.id}-category`}
              disabled={saving}
              className="w-full rounded border border-white/20 bg-black/40 p-2 text-base focus:border-green-400 focus:outline-none"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setSubcategory("");
              }}
            >
              {visibleCategories.map((itemCategory) => (
                <option key={itemCategory.id} value={itemCategory.id}>
                  {itemCategory.label}
                </option>
              ))}
            </select>
          </FormField>
          {selectedCategory && selectedCategory.subcategories.length > 0 && (
            <FormField id={`inventory-edit-${item.id}-subcategory`} label="Subcategory">
              <select
                id={`inventory-edit-${item.id}-subcategory`}
                disabled={saving}
                className="w-full rounded border border-white/20 bg-black/40 p-2 text-base focus:border-green-400 focus:outline-none"
                value={subcategory}
                onChange={(event) => setSubcategory(event.target.value)}
              >
                <option value="">Choose a subcategory</option>
                {getInventorySubcategoryOptions(selectedCategory.id).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField
            id={`inventory-edit-${item.id}-amount`}
            label="Current stock"
            hint="Set this to the amount you physically have. Stock changes appear in Recent stock history."
          >
            <input
              id={`inventory-edit-${item.id}-amount`}
              type="number"
              min="0"
              step="any"
              disabled={saving}
              className="w-full rounded border border-white/20 bg-black/40 p-2 text-base focus:border-green-400 focus:outline-none"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </FormField>
          <FormField id={`inventory-edit-${item.id}-minimum`} label="Minimum amount">
            <input
              id={`inventory-edit-${item.id}-minimum`}
              type="number"
              min="0"
              step="any"
              disabled={saving}
              className="w-full rounded border border-white/20 bg-black/40 p-2 text-base focus:border-green-400 focus:outline-none"
              value={minimumAmount}
              onChange={(event) => setMinimumAmount(event.target.value)}
            />
          </FormField>
          {editError && (
            <p id={`inventory-edit-${item.id}-error`} role="alert" className="text-sm text-amber-300">
              {editError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={confirmEdit}
              disabled={saving}
              className="rounded border border-green-500 bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded border border-zinc-500 bg-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!editMode && (
        <div className="flex justify-end gap-3 border-t border-white/10 pt-2">
          <button
            onClick={startEdit}
            className="rounded border border-green-500 bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600"
          >
            Update
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            type="button"
            className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
          >
            Delete
          </button>
        </div>
      )}
      {deleteError && (
        <p role="alert" className="text-sm text-amber-300">
          {deleteError}
        </p>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete inventory item?"
        message={`Delete "${item.name}" from your inventory? This action cannot be undone.`}
        confirmLabel="Delete item"
        onConfirm={deleteInventoryItemConfirmed}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
