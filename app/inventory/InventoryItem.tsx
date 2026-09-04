"use client";

import { useState } from "react";
import { useInventory } from "./useInventory";

export default function InventoryItem({ item }: { item: any }) {
  const { updateItem, deleteItem } = useInventory();
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

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col">
      <h3 className="text-xl font-bold mb-1">{item.name}</h3>

      <p className="text-lg opacity-80 mb-2 capitalize">
        {item.category.replace("_", " ")}
      </p>

      <p className="text-3xl font-bold mb-2">
        {item.amount} {item.unit}
      </p>

      <p className={`font-semibold mb-4 ${statusColor}`}>Status: {status}</p>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="number"
          className="p-2 bg-black/40 border border-white/20 rounded w-24"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          onClick={() => updateItem(item.id, Number(amount))}
          className="px-3 py-2 bg-green-700 hover:bg-green-600 rounded border border-green-500"
        >
          Update
        </button>
      </div>

      <button
        onClick={() => deleteItem(item.id)}
        className="px-3 py-2 bg-red-700 hover:bg-red-600 border border-red-500 rounded-lg"
      >
        Delete
      </button>
    </div>
  );
}
