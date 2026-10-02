"use client";

import { useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function InventoryItem({
  item,
  profile,
  updateItem,
  deleteItem,
}: {
  item: any;
  profile: any;
  updateItem: (id: string, amount: number, minimumAmount: number) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}) {
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [amount, setAmount] = useState(item.amount);
  const [minimumAmount, setMinimumAmount] = useState(item.minimum_amount ?? "");
  const snusCategories = ["snus", "snusessens"];
  const minimum = Number(item.minimum_amount);
  const current = Number(item.amount);

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
    setAmount(item.amount);
    setMinimumAmount(item.minimum_amount ?? "");
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setAmount(item.amount);
    setMinimumAmount(item.minimum_amount ?? "");
  }

  async function confirmEdit() {
    await updateItem(item.id, Number(amount), Number(minimumAmount));
    setEditMode(false);
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
          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
        </div>
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
        <div className="mt-1 flex flex-col gap-3">
          <label className="flex items-center justify-between gap-2 text-sm">
            Amount
            <input
              type="number"
              className="w-24 rounded border border-white/20 bg-black/40 p-2 text-base"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            Minimum amount
            <input
              type="number"
              className="w-24 rounded border border-white/20 bg-black/40 p-2 text-base"
              value={minimumAmount}
              onChange={(event) => setMinimumAmount(event.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={confirmEdit}
              className="rounded border border-green-500 bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600"
            >
              Confirm
            </button>
            <button
              onClick={cancelEdit}
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
