"use client";

import { useState, useEffect } from "react";
import BackButton from "./BackButton";
import MenuOverlay from "../components/MenuOverlay";
import InventoryList from "./InventoryList";
import InventoryMovementHistory from "./InventoryMovementHistory";
import InventoryGuide from "./InventoryGuide";
import AddItemModal from "./AddItemModal";
import { useInventory } from "./useInventory";
import Link from "next/link";
import { useRef } from "react";
import PageHeading from "@/app/components/PageHeading";
import PremiumFeaturePrompt from "@/app/components/PremiumFeaturePrompt";
import {
  getInventoryItemCategory,
  INVENTORY_CATEGORIES,
  SNUS_CATEGORIES,
} from "@/lib/inventory/categories";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SHOPPING_LIST_ERROR_KEYS, translateApiError } from "@/lib/i18n/apiErrors";

export default function InventoryPage() {
  const { t } = useTranslation();
  const {
    items,
    loading,
    loadError,
    reloadItems,
    profile,
    addItem,
    updateItem,
    deleteItem,
  } = useInventory();
  const [modalOpen, setModalOpen] = useState(false);
  const [planningBusy, setPlanningBusy] = useState(false);
  const [planningMessage, setPlanningMessage] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState("all");
  const [inventoryStockFilter, setInventoryStockFilter] = useState("all");
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
  const inventoryCategories = [
    ...INVENTORY_CATEGORIES,
    ...(profile?.snus_is_true
      ? SNUS_CATEGORIES.map((id) => ({ id, label: id, subcategories: [] as string[] }))
      : []),
  ];
  const filteredInventoryItems = items.filter((item) => {
    const mappedCategory = getInventoryItemCategory(item.category, item.subcategory);
    const isLowStock = Number(item.amount) <= Number(item.minimum_amount);
    const query = inventorySearch.trim().toLocaleLowerCase();
    const searchableText = [
      item.name,
      mappedCategory.category,
      mappedCategory.subcategory,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();

    return (
      (inventoryCategory === "all" || mappedCategory.category === inventoryCategory) &&
      (inventoryStockFilter === "all" ||
        (inventoryStockFilter === "low" ? isLowStock : !isLowStock)) &&
      (!query || searchableText.includes(query))
    );
  });
  const inventoryBrowserActive =
    inventorySearch.trim().length > 0 ||
    inventoryCategory !== "all" ||
    inventoryStockFilter !== "all";

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
        if (!response.ok) throw new Error(result.error || t("Could not add stock items"));
        addedItems += batch.length;
      }
      setPlanningMessage(`${t("Added")} ${restockItems.length} ${t(restockItems.length === 1 ? "low-stock item" : "low-stock items")} ${t("to your shopping list.")}`);
    } catch (error) {
      console.error("Could not plan inventory restock", error);
      const message = error instanceof Error
        ? translateApiError(error.message, t, SHOPPING_LIST_ERROR_KEYS)
        : t("Could not create a restock plan.");
      setPlanningMessage(
        addedItems > 0
          ? `${t("Added")} ${addedItems} ${t("of")} ${restockItems.length} ${t("items before an error:")} ${message}`
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
    <main className="min-h-screen flex flex-col items-center px-2 py-12 text-white sm:px-6">
      <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl w-full max-w-5xl border border-white/10 relative pt-16 sm:p-8 sm:pt-16">

        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay current="inventory" />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <PageHeading
          title={t("Inventory")}
          subtitle={t("Overview of categories and low-stock items.")}
        />
        {loadError && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-500/40 bg-red-950/40 p-4 text-center"
          >
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void reloadItems()}
              className="mt-3 rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
            >
              {t("Try again")}
            </button>
          </div>
        )}

        <div className="text-center mb-10">
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            {t("Add new item")}
          </button>
        </div>

        <section aria-label={t("Search and filter inventory")} className="mx-auto mb-6 max-w-4xl">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label>
              <span className="sr-only">{t("Search items by name or category")}</span>
              <input
                type="search"
                value={inventorySearch}
                onChange={(event) => setInventorySearch(event.target.value)}
                placeholder={t("Search inventory…")}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2.5 text-sm"
              />
            </label>
            <label>
              <span className="sr-only">{t("Filter inventory by category")}</span>
              <select
                value={inventoryCategory}
                onChange={(event) => setInventoryCategory(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2.5 text-sm"
              >
                <option value="all">{t("All categories")}</option>
                {inventoryCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {t(category.label)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{t("Filter inventory by stock level")}</span>
              <select
                value={inventoryStockFilter}
                onChange={(event) => setInventoryStockFilter(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2.5 text-sm"
              >
                <option value="all">{t("All stock levels")}</option>
                <option value="low">{t("Low stock")}</option>
                <option value="in-stock">{t("In stock")}</option>
              </select>
            </label>
          </div>
          {inventoryBrowserActive && (
            <p aria-live="polite" className="mt-2 text-right text-xs text-white/50">
              {t("Showing")} {filteredInventoryItems.length} {t("of")} {items.length} {t("items")}
            </p>
          )}
          {inventoryBrowserActive &&
            (loading ? (
              <p role="status" className="py-8 text-center text-sm text-white/60">
                {t("Loading inventory…")}
              </p>
            ) : loadError ? (
              <p className="py-8 text-center text-sm text-white/60">
                {t("Inventory search is unavailable until items load.")}
              </p>
            ) : filteredInventoryItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/60">
                {items.length === 0
                  ? t("No inventory items yet. Add an item to start tracking your stock.")
                  : t("No items match these search and filter options.")}
              </p>
            ) : (
              <InventoryList
                items={filteredInventoryItems}
                profile={profile}
                updateItem={updateItem}
                deleteItem={deleteItem}
              />
            ))}
        </section>

        <h2 className="text-2xl font-bold mt-2 mb-4 text-center text-green-300">{t("Categories")}</h2>

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
    className="min-w-0 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex flex-col sm:p-6"
  >
    <span className="mb-3 break-words text-base font-semibold leading-snug sm:text-xl">
      {t(cat.label)}
    </span>

    <div className="text-white/80 text-sm mb-1">
      {loading || loadError
        ? t("Item count unavailable")
        : `${catCount} ${t(catCount === 1 ? "item" : "items")}`}
    </div>

    {loading || loadError ? (
      <div className="text-white/60 text-sm">
        {loading ? t("Loading…") : t("Inventory unavailable")}
      </div>
    ) : catCount === 0 ? (
      <div className="text-white/60 text-sm">{t("No items yet")}</div>
    ) : catLow.length > 0 ? (
      <div className="text-yellow-400 text-sm">
        {catLow.length} {t(catLow.length === 1 ? "low-stock item" : "low-stock items")}
      </div>
    ) : (
      <div className="text-green-400 text-sm">{t("In stock")}</div>
    )}
  </div>
</Link>

    );
  })}
</div>

{/* Snus-seksjon */}
{profile?.snus_is_true && (
  <>
    <h2 className="text-2xl font-bold mb-4 text-center">{t("Snus")}</h2>

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
        className="min-w-0 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex flex-col sm:p-6"
      >
        <span className="mb-3 break-words text-base font-semibold leading-snug capitalize sm:text-xl">
          {t(cat.replace("_", " "))}
        </span>

        <div className="text-white/80 text-sm mb-1">
          {loading || loadError
            ? t("Item count unavailable")
            : `${catCount} ${t(catCount === 1 ? "item" : "items")}`}
        </div>

        {loading || loadError ? (
          <div className="text-white/60 text-sm">
            {loading ? t("Loading…") : t("Inventory unavailable")}
          </div>
        ) : catCount === 0 ? (
          <div className="text-white/60 text-sm">{t("No items yet")}</div>
        ) : catLow.length > 0 ? (
          <div className="text-yellow-400 text-sm">
            {catLow.length} {t(catLow.length === 1 ? "low-stock item" : "low-stock items")}
          </div>
        ) : (
          <div className="text-green-400 text-sm">{t("In stock")}</div>
        )}
      </Link>
    );
  })}
</div>

  </>
)}


        <h2 className="text-2xl font-bold mb-4 text-center">{t("Low stock")}</h2>

        {profile?.has_premium_access === true ? (
          <div className="mb-4 text-center">
            <button
              type="button"
              onClick={() => void addLowStockToShoppingList()}
              disabled={planningBusy || loading || Boolean(loadError) || restockableItems.length === 0}
              className="rounded-lg border border-green-500/40 bg-green-800/60 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {planningBusy ? t("Adding items…") : t("Plan restock from low-stock items")}
            </button>
            {planningMessage && <p role="status" className="mt-2 text-sm text-white/70">{planningMessage}</p>}
            <p className="mx-auto mt-2 max-w-2xl text-sm text-white/60">
              {t("Adds low-stock items as purchase suggestions to your")}{" "}
              <Link href="/shopping-list" className="text-green-200 underline underline-offset-2">
                {t("shopping list")}
              </Link>
              . {t("Existing unchecked entries with the same item name and unit have their quantities added together; checked entries are left unchanged. Planning a restock does not change your recorded stock.")}
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <PremiumFeaturePrompt
              feature={t("Low-stock restock planning")}
              description={
                lowItems.length
                  ? `${t("You have")} ${lowItems.length} ${t(lowItems.length === 1 ? "low-stock item" : "low-stock items")} ${t("Premium can turn them into purchase suggestions without changing your recorded stock.")}`
                  : t("When an ingredient or supply runs low, Premium can turn it into a purchase suggestion without changing your recorded stock.")
              }
              benefits={[
                t("Add low-stock amounts to your shopping list in one step."),
                t("Combine quantities with matching unchecked shopping-list entries."),
              ]}
            />
          </div>
        )}

        {loading ? (
          <p className="opacity-60 text-center mt-10">{t("Loading…")}</p>
        ) : loadError ? (
          <p className="opacity-60 mb-10 text-center">
            {t("Low-stock items are unavailable until inventory loads.")}
          </p>
        ) : lowItems.length === 0 ? (
          <p className="opacity-60 mb-10 text-center">{t("No low‑stock items.")}</p>
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
      <InventoryGuide />
    </main>
  );
}
