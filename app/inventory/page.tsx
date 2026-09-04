"use client";

import { useEffect, useState } from "react";
import BackButton from "./BackButton";
import MenuOverlay from "../components/MenuOverlay";
import InventoryList from "./InventoryList";
import AddItemModal from "./AddItemModal";
import { useInventory } from "./useInventory";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import Link from "next/link";

const categories = [
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

export default function InventoryPage() {
  const { items, loading } = useInventory();
  const [profile, setProfile] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) return;

      const res = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      setProfile(data);
    }

    loadProfile();

    const onFocus = () => loadProfile();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (profile && profile.use_inventory === false) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Inventory system is disabled</h1>
      </main>
    );
  }

  const lowItems = items.filter((i) => {
    const current = Number(i.amount);
    const minimum = Number(i.minimum_amount);
    return current <= minimum;
  });

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

        {/* ADD ITEM BUTTON */}
        <div className="text-center mb-10">
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            Add new item
          </button>
        </div>

        {/* CATEGORY GRID */}
<h2 className="text-2xl font-bold mt-2 mb-4 text-center">Categories</h2>

<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
  {categories.map((cat) => {
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
        className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex flex-col"
      >
        <span className="text-xl font-semibold capitalize mb-3">
          {cat.replace("_", " ")}
        </span>

        {/* NUMBER OF ITEMS */}
        <div className="text-white/80 text-sm mb-1">
          {catCount} item{catCount !== 1 ? "s" : ""}
        </div>

        {/* LOW STOCK STATUS */}
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

        {/* GLOBAL LOW STOCK */}
        <h2 className="text-2xl font-bold mb-4 text-center">Low stock (all categories)</h2>

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

      <AddItemModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  );
}
