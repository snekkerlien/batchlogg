"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import {
  getSavedRecipeShoppingRequirements,
  type InventoryItem,
} from "@/lib/inventory/recipeInventory";

type Recipe = Record<string, unknown> & {
  id: string;
  name: string;
  type: string;
};

type ShoppingItem = {
  id: string;
  recipe_id: string | null;
  name: string;
  amount: number;
  unit: string;
  is_checked: boolean;
};

type ShoppingItemInput = Omit<ShoppingItem, "id" | "is_checked"> & {
  is_checked?: boolean;
};

async function requestShoppingList(
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
  id?: string
) {
  const url = id ? `/api/shopping-list?id=${encodeURIComponent(id)}` : "/api/shopping-list";
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result: {
    error?: string;
    items?: ShoppingItem[];
    deleted_ids?: string[];
  } = await response.json();
  if (!response.ok) throw new Error(result.error || "Shopping-list request failed");
  return result;
}

export default function ShoppingListPage() {
  const router = useRouter();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [loading, setLoading] = useState(true);
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function applyAddedShoppingItems(result: {
    items?: ShoppingItem[];
    deleted_ids?: string[];
  }) {
    const deletedIds = new Set(result.deleted_ids ?? []);
    setItems((current) => {
      const next = current.filter((item) => !deletedIds.has(item.id));
      for (const addedItem of result.items ?? []) {
        const index = next.findIndex((item) => item.id === addedItem.id);
        if (index === -1) next.push(addedItem);
        else next[index] = addedItem;
      }
      return next;
    });
  }

  const load = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseBrowser.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      router.replace("/auth/login");
      return;
    }

    const listResponse = await fetch("/api/shopping-list", {
      cache: "no-store",
      credentials: "include",
    });
    if (listResponse.status === 403) {
      setPremiumRequired(true);
      return;
    }
    const [recipesResult, inventoryResult] = await Promise.all([
      supabaseBrowser
        .from("recipes")
        .select("*")
        .eq("user_id", session.user.id)
        .order("name", { ascending: true }),
      supabaseBrowser
        .from("inventory_items")
        .select("id, name, amount, unit, minimum_amount, category, subcategory, alpha_acid, ebc, hop_year")
        .eq("user_id", session.user.id),
    ]);
    if (!listResponse.ok) {
      const result: { error?: string } = await listResponse.json();
      throw new Error(result.error || "Could not load shopping list");
    }
    const listResult: { items?: ShoppingItem[] } = await listResponse.json();
    if (recipesResult.error) throw recipesResult.error;
    if (inventoryResult.error) throw inventoryResult.error;
    setItems(listResult.items ?? []);
    setRecipes((recipesResult.data ?? []) as Recipe[]);
    setInventory(
      (inventoryResult.data ?? []).map((item) => ({
        ...item,
        amount: Number(item.amount),
        minimum_amount: Number(item.minimum_amount ?? 0),
      }))
    );
  }, [router]);

  useEffect(() => {
    let active = true;
    load()
      .catch((loadError) => {
        console.error("Could not load shopping list", loadError);
        if (active) setError("Your shopping list could not be loaded. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  if (premiumRequired) {
    return (
      <main className="min-h-screen px-4 py-10 text-white sm:px-6">
        <div className="relative mx-auto max-w-3xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 text-center backdrop-blur-md sm:p-8">
          <div className="absolute right-4 top-3"><MenuOverlay current="shopping-list" /></div>
          <PageHeading title="Shopping list" subtitle="Plan ingredients for your next brew." />
          <p className="text-white/75">The shopping list is part of Batchlogg Premium.</p>
          <Link href="/premium" className="mt-5 inline-block rounded-lg bg-green-700 px-5 py-3 font-semibold hover:bg-green-600">
            Explore Premium
          </Link>
        </div>
      </main>
    );
  }

  async function addRecipeIngredients() {
    const recipe = recipes.find((item) => item.id === recipeId);
    if (!recipe) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const requirements = getSavedRecipeShoppingRequirements(recipe, inventory);
      const missing = requirements
        .filter((item) => item.amount === null || item.amount > 0)
        .map((item) => ({
          recipe_id: recipe.id,
          name: item.name,
          amount: item.amount ?? 0,
          unit: item.unit,
        }));
      if (!missing.length) {
        setMessage("Your inventory covers every measured ingredient in this recipe.");
        return;
      }
      const result = await requestShoppingList("POST", { items: missing });
      applyAddedShoppingItems(result);
      setMessage(`Added ${missing.length} ingredient${missing.length === 1 ? "" : "s"} from ${recipe.name}.`);
    } catch (addError) {
      console.error("Could not add recipe ingredients to shopping list", addError);
      setError(addError instanceof Error ? addError.message : "Could not add recipe ingredients.");
    } finally {
      setBusy(false);
    }
  }

  async function addManualItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const amount = newAmount.trim() ? Number(newAmount.replace(",", ".")) : 0;
      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Enter a valid amount.");
      }
      const result = await requestShoppingList("POST", {
        name: newName,
        amount,
        unit: newUnit,
        recipe_id: null,
      });
      applyAddedShoppingItems(result);
      setNewName("");
      setNewAmount("");
      setNewUnit("");
      setMessage("Item added.");
    } catch (addError) {
      console.error("Could not add shopping-list item", addError);
      setError(addError instanceof Error ? addError.message : "Could not add item.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleItem(item: ShoppingItem) {
    setError("");
    try {
      await requestShoppingList("PATCH", { id: item.id, is_checked: !item.is_checked });
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, is_checked: !entry.is_checked } : entry
        )
      );
    } catch (updateError) {
      console.error("Could not update shopping-list item", updateError);
      setError(updateError instanceof Error ? updateError.message : "Could not update item.");
    }
  }

  async function removeItem(item: ShoppingItem) {
    setError("");
    try {
      await requestShoppingList("DELETE", undefined, item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (deleteError) {
      console.error("Could not remove shopping-list item", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Could not remove item.");
    }
  }

  async function clearShoppingList() {
    if (!items.length) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await requestShoppingList("DELETE");
      setItems([]);
      setMessage("Shopping list cleared.");
      return true;
    } catch (clearError) {
      console.error("Could not clear shopping list", clearError);
      setError(clearError instanceof Error ? clearError.message : "Could not clear shopping list.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const uncheckedItems = items.filter((item) => !item.is_checked);
  const checkedItems = items.filter((item) => item.is_checked);

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto w-full max-w-4xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute left-4 top-3 z-20">
          <BackButton />
        </div>
        <div className="absolute right-4 top-3 z-20">
          <MenuOverlay current="shopping-list" />
        </div>
        <PageHeading
          title="Shopping list"
          subtitle="Add recipe ingredients you’re short on, then check them off as you shop."
        />

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-950/50 p-3 text-center text-red-200">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-lg bg-green-950/40 p-3 text-center text-green-200">{message}</p>}

        <section id="add-recipe-ingredients" className="mb-8 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 text-lg font-semibold text-green-300">Add ingredients from a recipe</h2>
          <p className="mb-3 text-sm text-white/60">
            Repeated ingredients are combined, and quantities are compared with matching inventory items. Ingredients with no recorded amount are added with an empty quantity for you to fill in.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Choose recipe</span>
              <select
                value={recipeId}
                onChange={(event) => setRecipeId(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
              >
                <option value="">Choose a recipe</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} · {recipe.type}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void addRecipeIngredients()}
              disabled={!recipeId || busy}
              className="rounded-lg border border-green-500/50 bg-green-700/70 px-4 py-3 font-semibold hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add missing ingredients"}
            </button>
          </div>
          {recipes.length === 0 && !loading && (
            <p className="mt-3 text-sm text-white/60">
              You don’t have any saved recipes yet. <Link href="/my-recipes" className="text-green-300 underline">Create a recipe</Link>.
            </p>
          )}
        </section>

        <section className="mb-8 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 text-lg font-semibold text-green-300">Add an item</h2>
          <form onSubmit={addManualItem} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <label className="sr-only" htmlFor="shopping-item-name">Item name</label>
            <input
              id="shopping-item-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              maxLength={200}
              required
              placeholder="Ingredient or supply"
              className="rounded-lg border border-white/20 bg-black/40 p-3"
            />
            <label className="sr-only" htmlFor="shopping-item-amount">Amount</label>
            <input
              id="shopping-item-amount"
              value={newAmount}
              onChange={(event) => setNewAmount(event.target.value)}
              type="number"
              min="0"
              step="any"
              placeholder="Amount"
              className="rounded-lg border border-white/20 bg-black/40 p-3"
            />
            <label className="sr-only" htmlFor="shopping-item-unit">Unit</label>
            <input
              id="shopping-item-unit"
              value={newUnit}
              onChange={(event) => setNewUnit(event.target.value)}
              maxLength={32}
              placeholder="Unit"
              className="rounded-lg border border-white/20 bg-black/40 p-3"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 font-semibold hover:bg-white/20 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </section>

        {loading ? (
          <p className="py-8 text-center text-white/60">Loading your list…</p>
        ) : items.length === 0 ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <h2 className="font-semibold text-white">Your shopping list is empty.</h2>
            <p className="mt-2 text-sm text-white/60">
              Add missing ingredients from a recipe or create a list item manually.
            </p>
            <Link
              href="#add-recipe-ingredients"
              className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-green-400/50 bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
            >
              Add ingredients from a recipe
            </Link>
          </section>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                disabled={busy}
                className="rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear shopping list
              </button>
            </div>
            <ShoppingItems title="To buy" items={uncheckedItems} onToggle={toggleItem} onRemove={removeItem} />
            {checkedItems.length > 0 && (
              <ShoppingItems title="In your basket" items={checkedItems} onToggle={toggleItem} onRemove={removeItem} />
            )}
          </div>
        )}
        <ConfirmDialog
          open={confirmClearOpen}
          title="Clear shopping list?"
          message="This will permanently remove every item from your shopping list. This action cannot be undone."
          confirmLabel="Clear list"
          onConfirm={clearShoppingList}
          onCancel={() => setConfirmClearOpen(false)}
        />
      </div>
    </main>
  );
}

function ShoppingItems({
  title,
  items,
  onToggle,
  onRemove,
}: {
  title: string;
  items: ShoppingItem[];
  onToggle: (item: ShoppingItem) => void;
  onRemove: (item: ShoppingItem) => void;
}) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-green-300">{title}</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <input
              type="checkbox"
              checked={item.is_checked}
              onChange={() => onToggle(item)}
              aria-label={`${item.is_checked ? "Uncheck" : "Check off"} ${item.name}`}
              className="h-5 w-5 accent-green-500"
            />
            <div className={`min-w-0 flex-1 ${item.is_checked ? "text-white/45 line-through" : ""}`}>
              <p className="break-words font-medium">{item.name}</p>
              <p className="text-sm text-white/55">
                {item.amount > 0 ? `${item.amount} ${item.unit}`.trim() : "Amount not specified"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item.name}`}
              className="rounded border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
