"use client";

import InventoryItem from "./InventoryItem";

export default function InventoryList({
  items,
  profile,
  updateItem,
  deleteItem,
}: {
  items: any[];
  profile: any;
  updateItem: (id: string, amount: number, minimumAmount: number) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}) {
  const snusCategories = ["snus", "snusessens"];
  const visibleItems = items.filter(
    (item) =>
      profile?.snus_is_true || !snusCategories.includes(item.category)
  );

  return (
    <div className="grid grid-cols-1 gap-6 mt-10 sm:grid-cols-2 md:grid-cols-3">
      {visibleItems.map((item) => (
        <InventoryItem
          key={item.id}
          item={item}
          profile={profile}
          updateItem={updateItem}
          deleteItem={deleteItem}
        />
      ))}
    </div>
  );
}
