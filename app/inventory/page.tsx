"use client";

import { useState, useEffect } from "react";
import BackButton from "./BackButton";
import MenuOverlay from "../components/MenuOverlay";
import InventoryList from "./InventoryList";
import InventoryMovementHistory from "./InventoryMovementHistory";
import AddItemModal from "./AddItemModal";
import { useInventory } from "./useInventory";
import Link from "next/link";
import { useRef } from "react";
import PageHeading from "@/app/components/PageHeading";
import {
  getInventoryItemCategory,
  INVENTORY_CATEGORIES,
  SNUS_CATEGORIES,
} from "@/lib/inventory/categories";

export default function InventoryPage() {
  const {
    items,
    loading,
    profile,
    addItem,
    updateItem,
    deleteItem,
  } = useInventory();
  const [modalOpen, setModalOpen] = useState(false);
  const [planningBusy, setPlanningBusy] = useState(false);
  const [planningMessage, setPlanningMessage] = useState("");
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);


  const visibleSnusCategories =
    profile?.snus_is_true
      ? SNUS_CATEGORIES
      : [];

  const lowItems = items.filter((i) => {
    if (!profile?.snus_is_true && SNUS_CATEGORIES.includes(i.category)) {
      return false;
    }

    const current = Number(i.amount);
    const minimum = Number(i.minimum_amount);
    return current <= minimum;
  });
  const restockableItems = lowItems;

  async function addLowStockToShoppingList() {
    const restockItems = restockableItems.map((item) => {
      const amount = Number(item.amount);
      const minimum = Number(item.minimum_amount);
      return {
        name: item.name,
        amount: amount < minimum ? minimum - amount : minimum,
        unit: item.unit ?? "",
        recipe_id: null,
      };
    });
    setPlanningBusy(true);
    setPlanningMessage("");
    let addedItems = 0;
    try {
      for (let start = 0; start < restockItems.length; start += 100) {
        const batch = restockItems.slice(start, start + 100);
        const response = await fetch("/api/shopping-list", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: batch }),
        });
        const result: { error?: string } = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not add stock items");
        addedItems += batch.length;
      }
      setPlanningMessage(`Added ${restockItems.length} low-stock item${restockItems.length === 1 ? "" : "s"} to your shopping list.`);
    } catch (error) {
      console.error("Could not plan inventory restock", error);
      const message = error instanceof Error ? error.message : "Could not create a restock plan.";
      setPlanningMessage(
        addedItems > 0
          ? `Added ${addedItems} of ${restockItems.length} items before an error: ${message}`
          : message
      );
    } finally {
      setPlanningBusy(false);
    }
  }

useEffect(() => {
  if (cardRef.current) {
    setCardWidth(cardRef.current.offsetWidth);
  }
}, [items, profile]);


  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-5xl border border-white/10 relative pt-16 sm:pt-16">

        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay current="inventory" />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <PageHeading
          title="Inventory"
          subtitle="Overview of categories and low-stock items."
        />

        <div className="text-center mb-10">
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            Add new item
          </button>
        </div>

        <h2 className="text-2xl font-bold mt-2 mb-4 text-center text-green-300">Categories</h2>

{/* Vanlige kategorier */}
<div className="grid grid-cols-1 gap-6 mb-12 sm:grid-cols-2 md:grid-cols-6">
  {INVENTORY_CATEGORIES.map((cat, index) => {
    const catItems = items.filter(
      (item) => getInventoryItemCategory(item.category, item.subcategory).category === cat.id
    );
    const catCount = catItems.length;

    const catLow = catItems.filter((i) => {
      const current = Number(i.amount);
      const minimum = Number(i.minimum_amount);
      return current <= minimum;
    });

    const isLastRow = index >= INVENTORY_CATEGORIES.length - 2;
    const centeredLastRowClass =
      index === INVENTORY_CATEGORIES.length - 2
        ? "md:col-start-2"
        : index === INVENTORY_CATEGORIES.length - 1
          ? "md:col-start-4"
          : "";

    return (
      <Link
        key={cat.id}
        href={`/inventory/category/${cat.id}`}
        className={`md:col-span-2 ${isLastRow ? centeredLastRowClass : ""}`}
      >
  <div
    ref={cat.id === INVENTORY_CATEGORIES[0].id ? cardRef : null}
    className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex flex-col"
  >
    <span className="text-xl font-semibold mb-3">
      {cat.label}
    </span>

    <div className="text-white/80 text-sm mb-1">
      {catCount} item{catCount !== 1 ? "s" : ""}
    </div>

    {catLow.length > 0 ? (
      <div className="text-yellow-400 text-sm">
        {catLow.length} low‑stock item{catLow.length > 1 ? "s" : ""}
      </div>
    ) : (
      <div className="text-green-400 text-sm">All good</div>
    )}
  </div>
</Link>

    );
  })}
</div>

{/* Snus-seksjon */}
{profile?.snus_is_true && (
  <>
    <h2 className="text-2xl font-bold mb-4 text-center">Snus</h2>

    <div className="flex flex-wrap justify-center gap-6 mb-12">
  {visibleSnusCategories.map((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    const catCount = catItems.length;

    const catLow = catItems.filter((i) => {
      const current = Number(i.amount);
      const minimum = Number(i.minimum_amount);
      return current <= minimum;
    });

    return (
      <Link
        key={cat}
        href={`/inventory/category/${cat}`}
        style={{ width: cardWidth ? `${cardWidth}px` : "auto" }}
        className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex flex-col"
      >
        <span className="text-xl font-semibold capitalize mb-3">
          {cat.replace("_", " ")}
        </span>

        <div className="text-white/80 text-sm mb-1">
          {catCount} item{catCount !== 1 ? "s" : ""}
        </div>

        {catLow.length > 0 ? (
          <div className="text-yellow-400 text-sm">
            {catLow.length} low‑stock item{catLow.length > 1 ? "s" : ""}
          </div>
        ) : (
          <div className="text-green-400 text-sm">All good</div>
        )}
      </Link>
    );
  })}
</div>

  </>
)}


        <h2 className="text-2xl font-bold mb-4 text-center">Low stock</h2>

        {profile?.account_tier === "premium" ? (
          <div className="mb-4 text-center">
            <button
              type="button"
              onClick={() => void addLowStockToShoppingList()}
              disabled={planningBusy || restockableItems.length === 0}
              className="rounded-lg border border-green-500/40 bg-green-800/60 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {planningBusy ? "Adding items…" : "Plan restock from low-stock items"}
            </button>
            {planningMessage && <p role="status" className="mt-2 text-sm text-white/70">{planningMessage}</p>}
          </div>
        ) : (
          <p className="mb-4 text-center text-sm text-white/60">
            <Link href="/premium" className="text-green-200 underline">Premium</Link>
            {" "}can turn low-stock items into a purchase plan.
          </p>
        )}

        {loading ? (
          <p className="opacity-60 text-center mt-10">Loading…</p>
        ) : lowItems.length === 0 ? (
          <p className="opacity-60 mb-10 text-center">No low‑stock items.</p>
        ) : (
          <InventoryList
            items={lowItems}
            profile={profile}
            updateItem={updateItem}
            deleteItem={deleteItem}
          />
        )}

        <InventoryMovementHistory />

      </div>

      <AddItemModal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  profile={profile}
  onAddItem={addItem}
/>
    </main>
  );
}
