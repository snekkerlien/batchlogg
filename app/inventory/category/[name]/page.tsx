"use client";

import { useInventory } from "../../useInventory";
import InventoryList from "../../InventoryList";
import BackButton from "../../BackButton";
import MenuOverlay from "../../../components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

export default function CategoryPage({ params }: { params: { name: string } }) {
  const {
    items,
    loading,
    profile,
    profileLoaded,
    updateItem,
    deleteItem,
  } = useInventory();
  const category = params.name;
  const snusCategories = ["snus", "snusessens"];
  const isRestrictedCategory =
    profileLoaded &&
    snusCategories.includes(category) &&
    !profile?.snus_is_true;
  const filtered = items.filter((item) => item.category === category);

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-5xl border border-white/10 relative pt-16 sm:pt-0">
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
            <p className="text-sm opacity-40 mt-12 text-center">
              © {new Date().getFullYear()} Batchlog
            </p>
          </>
        ) : (
          <>
            <PageHeading
              title={category.replace("_", " ")}
              subtitle="All items in this category."
            />
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
            <p className="text-sm opacity-40 mt-12 text-center">
              © {new Date().getFullYear()} Batchlog
            </p>
          </>
        )}
      </div>
    </main>
  );
}
