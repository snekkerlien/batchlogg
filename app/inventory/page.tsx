"use client";

import { useState, useEffect } from "react";
import BackButton from "./BackButton";
import MenuOverlay from "../components/MenuOverlay";
import InventoryList from "./InventoryList";
import AddItemModal from "./AddItemModal";
import { useInventory } from "./useInventory";
import Link from "next/link";
import { useRef } from "react";

const baseCategories = [
  "honey",
  "fermentables",
  "fruit",
  "yeast",
  "nutrients",
  "additives",
  "bottling",
  "equipment",
  "cleaning",
];

const snusCategories = ["snus", "snusessens"];

export default function InventoryPage() {
  const { items, loading, profile } = useInventory();
  const [modalOpen, setModalOpen] = useState(false);
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);


  const visibleCategories =
    profile?.snus_is_true
      ? [...baseCategories, ...snusCategories]
      : baseCategories;

  const lowItems = items.filter((i) => {
    if (!profile?.snus_is_true && snusCategories.includes(i.category)) {
      return false;
    }

    const current = Number(i.amount);
    const minimum = Number(i.minimum_amount);
    return current <= minimum;
  });

  console.log("VISIBLE CATEGORIES:", visibleCategories);
  console.log("PROFILE IN INVENTORY PAGE:", profile);
  console.log("ITEMS IN INVENTORY PAGE:", items);
  console.log("HAS SNUS ACCESS:", profile?.snus_is_true);
  console.log("SNUS ITEMS:", items.filter(i => ["snus","snusessens"].includes(i.category)));

useEffect(() => {
  if (cardRef.current) {
    setCardWidth(cardRef.current.offsetWidth);
  }
}, [items, profile]);


  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-5xl border border-white/10 relative pt-16 sm:pt-0">

        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay current="inventory" />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <h1 className="text-4xl font-bold text-center mt-20 sm:mt-6">
          Inventory
        </h1>

        <p className="opacity-80 text-center mb-10 mt-6">
          Overview of categories and low‑stock items.
        </p>

        <div className="text-center mb-10">
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            Add new item
          </button>
        </div>

        <h2 className="text-2xl font-bold mt-2 mb-4 text-center">Categories</h2>

{/* Vanlige kategorier */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
  {baseCategories.map((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    const catCount = catItems.length;

    const catLow = catItems.filter((i) => {
      const current = Number(i.amount);
      const minimum = Number(i.minimum_amount);
      return current <= minimum;
    });

    return (
      <Link key={cat} href={`/inventory/category/${cat}`}>
  <div
    ref={cat === baseCategories[0] ? cardRef : null}
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
  {snusCategories.map((cat) => {
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

        {loading ? (
          <p className="opacity-60 text-center mt-10">Loading…</p>
        ) : lowItems.length === 0 ? (
          <p className="opacity-60 mb-10 text-center">No low‑stock items.</p>
        ) : (
          <InventoryList items={lowItems} />
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>

      <AddItemModal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  profile={profile}
/>
    </main>
  );
}
