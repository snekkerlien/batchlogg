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
  const snusCategories = ["snus", "snusessens"];
  const visibleItems = items.filter(
    (item) =>
      profile?.snus_is_true || !snusCategories.includes(item.category)
  );

  return (
    <div className="mt-10 grid grid-cols-1 items-start gap-6 sm:grid-cols-2 md:grid-cols-3">
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
