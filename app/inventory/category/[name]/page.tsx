"use client";

import { useState } from "react";
import { useInventory } from "../../useInventory";
import InventoryList from "../../InventoryList";
import AddItemModal from "../../AddItemModal";
import BackButton from "../../BackButton";
import MenuOverlay from "../../../components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import {
  INVENTORY_CATEGORIES,
  getInventoryItemCategory,
  LEGACY_CATEGORY_ALIASES,
  SNUS_CATEGORIES,
} from "@/lib/inventory/categories";

export default function CategoryPage({ params }: { params: { name: string } }) {
  const {
    items,
    loading,
    profile,
    profileLoaded,
    addItem,
    updateItem,
    deleteItem,
  } = useInventory();
  const [modalOpen, setModalOpen] = useState(false);
  const requestedCategory = params.name.toLowerCase();
  const category = LEGACY_CATEGORY_ALIASES[requestedCategory] ?? requestedCategory;
  const formattedCategoryTitle =
    INVENTORY_CATEGORIES.find((item) => item.id === category)?.label ??
    (SNUS_CATEGORIES.some((item) => item === category) ? category : "Inventory");
  const isRestrictedCategory =
    profileLoaded &&
    SNUS_CATEGORIES.some((item) => item === category) &&
    !profile?.snus_is_true;
  const isKnownCategory =
    INVENTORY_CATEGORIES.some((item) => item.id === category) ||
    SNUS_CATEGORIES.some((item) => item === category);
  const filtered = items
    .filter(
      (item) => getInventoryItemCategory(item.category, item.subcategory).category === category
    )
    .sort((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
        sensitivity: "base",
        numeric: true,
      })
    );

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-5xl border border-white/10 relative pt-16 sm:pt-16">
        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay current="inventory" />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        {isRestrictedCategory ? (
          <>
            <h1 className="text-4xl font-bold text-center mt-20 sm:mt-6">
              Access denied
            </h1>
            <p className="opacity-80 text-center mb-10 mt-6">
              You do not have permission to view this category.
            </p>
          </>
        ) : (
          <>
            <PageHeading
              title={formattedCategoryTitle}
              subtitle="All items in this category."
            />
            {isKnownCategory && (
              <div className="mb-8 mt-6 text-center">
                <button
                  onClick={() => setModalOpen(true)}
                  className="rounded-lg border border-green-500 bg-green-700 px-6 py-3 font-semibold hover:bg-green-600"
                >
                  Add new item
                </button>
              </div>
            )}
            {loading ? (
              <p className="opacity-60 text-center mt-10">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="opacity-60 text-center mt-10">
                No items in this category.
              </p>
            ) : (
              <InventoryList
                items={filtered}
                profile={profile}
                updateItem={updateItem}
                deleteItem={deleteItem}
              />
            )}
          </>
        )}
      </div>
      {isKnownCategory && !isRestrictedCategory && (
        <AddItemModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          profile={profile}
          onAddItem={addItem}
          fixedCategory={category}
        />
      )}
    </main>
  );
}
