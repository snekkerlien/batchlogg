"use client";

import { useInventory } from "../../useInventory";
import InventoryList from "../../InventoryList";
import BackButton from "../../BackButton";
import MenuOverlay from "../../../components/MenuOverlay";

export default function CategoryPage({ params }: { params: { name: string } }) {
  const { items, loading } = useInventory();
  const category = params.name;

  const filtered = items.filter((i) => i.category === category);

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-5xl border border-white/10 relative pt-16 sm:pt-0">

        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay current="inventory" />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <h1 className="text-4xl font-bold text-center mt-20 sm:mt-6 capitalize">
          {category.replace("_", " ")}
        </h1>

        <p className="opacity-80 text-center mb-10 mt-6">
          All items in this category.
        </p>

        {loading ? (
          <p className="opacity-60 text-center mt-10">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="opacity-60 text-center mt-10">No items in this category.</p>
        ) : (
          <InventoryList items={filtered} />
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>
    </main>
  );
}
