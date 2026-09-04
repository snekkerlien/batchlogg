"use client";

import InventoryItem from "./InventoryItem";

export default function InventoryList({ items }: { items: any[] }) {
  return (
    <div
      className="
        grid 
        grid-cols-1 
        sm:grid-cols-2 
        md:grid-cols-3 
        gap-6 
        mt-10
      "
    >
      {items.map((item) => (
        <InventoryItem key={item.id} item={item} />
      ))}
    </div>
  );
}
