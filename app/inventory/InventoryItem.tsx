"use client";

import { useState } from "react";
import { useInventory } from "./useInventory";

export default function InventoryItem({ item }: { item: any }) {
  const { updateItem, deleteItem } = useInventory();

  const [editMode, setEditMode] = useState(false);
  const [amount, setAmount] = useState(item.amount);

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
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setAmount(item.amount);
  }

  async function confirmEdit() {
    await updateItem(item.id, Number(amount));
    setEditMode(false);
  }

  return (
    <div
      className="
        p-4 
        bg-zinc-900 
        border border-white/10 
        rounded-xl 
        shadow 
        flex flex-col 
        justify-between
        h-44
      "
    >

      {/* HEADER */}
      <h3 className="text-base font-semibold line-clamp-2 leading-tight">
        {item.name}
      </h3>

      {/* INFO */}
      {!editMode && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-lg font-bold">
            {item.amount} {item.unit}
          </p>
          <span className={`font-semibold ${statusColor}`}>
            {status}
          </span>
        </div>
      )}

      {/* EDIT MODE */}
      {editMode && (
        <div className="flex items-center justify-between gap-3 mt-1">
          <input
            type="number"
            className="p-2 bg-black/40 border border-white/20 rounded w-20 text-base"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              onClick={confirmEdit}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded border border-green-500 text-sm font-semibold"
            >
              Confirm
            </button>

            <button
              onClick={cancelEdit}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded border border-zinc-500 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ACTIONS */}
      {!editMode && (
        <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
          <button
            onClick={startEdit}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded border border-green-500 text-sm font-semibold"
          >
            Update
          </button>

          <button
            onClick={() => deleteItem(item.id)}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded border border-red-500 text-sm font-semibold"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
