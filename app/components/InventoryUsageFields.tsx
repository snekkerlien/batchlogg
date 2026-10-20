"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { addInventoryItem } from "@/app/actions/inventoryActions";
import {
  getInventorySubcategoryOptions,
  isBatchAdditiveInventoryCategory,
  INVENTORY_CATEGORIES,
} from "@/lib/inventory/categories";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { convertIngredientAmount } from "@/lib/inventory/convertIngredientAmount";
import {
  getInventoryRequirementIssues,
  getSavedRecipeInventoryIssues,
  recipeInventoryRequirements,
  recipeRequirementsFromSavedRecipe,
  type InventoryItem,
  type RecipeInventoryRequirement,
} from "@/lib/inventory/recipeInventory";
import {
  parseRecipeAdditions,
  type AdditionItem,
} from "@/lib/recipes/additions";
import RecipeAdditiveFields from "@/app/my-recipes/new/RecipeAdditiveFields";

type InventoryUsage = {
  inventory_item_id: string;
  amount: string;
};

type BatchInventoryContextValue = {
  enabled: boolean;
  loaded: boolean;
  items: InventoryItem[];
  selections: Record<string, string>;
  setSelection: (key: string, itemId: string) => void;
  addItem: (formData: FormData) => Promise<InventoryItem>;
  error: string;
};

const BatchInventoryContext = createContext<BatchInventoryContextValue | null>(null);

export function BatchInventoryProvider({
  children,
  recipeId,
  recipe,
  className = "",
}: {
  children: ReactNode;
  recipeId?: string;
  recipe?: Record<string, unknown> | null;
  className?: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [bypassInventory, setBypassInventory] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [showInventoryCreator, setShowInventoryCreator] = useState(false);
  const [inventoryIssues, setInventoryIssues] = useState<string[] | null>(null);
  const [recipeInventoryWarnings, setRecipeInventoryWarnings] = useState<string[]>([]);
  const inventoryFormContent = useRef<HTMLDivElement>(null);
  const secondaryInventoryRequirements: RecipeInventoryRequirement[] = recipe
    ? (recipeRequirementsFromSavedRecipe(recipe) ?? []).filter((requirement) =>
        requirement.selectionKey.startsWith("secondary-")
      )
    : [];

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("skip_inventory") === "true") {
      setBypassInventory(true);
      setLoaded(true);
      return;
    }

    let active = true;

    async function loadInventory() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabaseBrowser.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("Authentication required");

        const { data: profile, error: profileError } = await supabaseBrowser
          .from("profiles")
          .select("use_inventory_for_batches")
          .eq("id", user.id)
          .maybeSingle();
        if (profileError) throw profileError;

        if (profile?.use_inventory_for_batches !== true) {
          if (active) setLoaded(true);
          return;
        }

        const { data, error: itemsError } = await supabaseBrowser
          .from("inventory_items")
          .select("id, name, amount, unit, minimum_amount, category, subcategory, alpha_acid, ebc, hop_year")
          .eq("user_id", user.id)
          .order("name");
        if (itemsError) throw itemsError;

        if (active) {
          setItems(
            (data ?? [])
              .filter((item) => !/\bwater\b/i.test(item.name))
              .map((item) => ({
                ...item,
                amount: Number(item.amount),
                minimum_amount: Number(item.minimum_amount ?? 0),
              }))
          );
          setEnabled(true);
        }
      } catch (loadError) {
        console.error("Could not load inventory for batch creation", loadError);
        if (active) {
          setError("Inventory could not be loaded. Refresh before creating this batch.");
        }
      } finally {
        if (active) setLoaded(true);
      }
    }

    void loadInventory();
    return () => {
      active = false;
    };
  }, []);

  const setSelection = useCallback((key: string, itemId: string) => {
    setSelections((current) => {
      const next = { ...current };
      if (itemId) next[key] = itemId;
      else delete next[key];
      return next;
    });
  }, []);

  async function addItem(formData: FormData) {
    const item = await addInventoryItem(formData, false);
    const inventoryItem: InventoryItem = {
      ...item,
      amount: Number(item.amount),
      minimum_amount: Number(item.minimum_amount ?? 0),
    };
    setItems((current) =>
      [...current.filter((existing) => existing.id !== inventoryItem.id), inventoryItem]
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    return inventoryItem;
  }

  useEffect(() => {
    if (!recipeId || !recipe || !loaded || !enabled || error) {
      setRecipeInventoryWarnings([]);
      return;
    }
    setRecipeInventoryWarnings(getSavedRecipeInventoryIssues(recipe, items));
  }, [enabled, error, items, loaded, recipe, recipeId]);

  const checkRecipeInventory = useCallback((event: SubmitEvent) => {
    if (!recipeId) return;
    if (!loaded) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setInventoryIssues([
        "Inventory is still loading. Wait for it to finish, then try again.",
      ]);
      return;
    }
    if (!enabled && !error) return;
    if (error) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setInventoryIssues([error]);
      return;
    }

    if (!(event.target instanceof HTMLFormElement)) return;
    const requirements = recipeInventoryRequirements(new FormData(event.target));
    if (!requirements) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setInventoryIssues([
        "The recipe ingredient list could not be checked. Reload the recipe and try again.",
      ]);
      return;
    }

    const issues = getInventoryRequirementIssues(requirements, items, selections, true);
    if (issues.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setInventoryIssues(issues);
    }
  }, [enabled, error, items, loaded, recipeId, selections]);

  useEffect(() => {
    const form = inventoryFormContent.current?.closest("form");
    if (!form) return;
    form.addEventListener("submit", checkRecipeInventory, true);
    return () => form.removeEventListener("submit", checkRecipeInventory, true);
  }, [checkRecipeInventory]);

  return (
    <BatchInventoryContext.Provider
      value={{ enabled, loaded, items, selections, setSelection, addItem, error }}
    >
      <div ref={inventoryFormContent} className={className}>
        <input type="hidden" name="recipe_id" value={recipeId ?? ""} />
        <input
          type="hidden"
          name="inventory_bypass"
          value={bypassInventory && recipeId ? "true" : "false"}
        />
        <input
          type="hidden"
          name="inventory_item_selections_json"
          value={JSON.stringify(selections)}
        />
        <input
          type="hidden"
          name="inventory_load_error"
          value={error ? "true" : "false"}
        />
        <input
          type="hidden"
          name="secondary_additions"
          value={typeof recipe?.secondary_additions === "string" ? recipe.secondary_additions : ""}
        />
        <input
          type="hidden"
          name="secondary_notes"
          value={typeof recipe?.secondary_notes === "string" ? recipe.secondary_notes : ""}
        />
        {enabled && (
          <p className="mb-4 rounded-lg border border-green-400/20 bg-green-500/[0.06] p-3 text-sm text-white/70">
            Matched ingredient amounts are deducted when you create this batch.
            Enter the amounts you actually use; if they differ, update the
            remaining stock in Inventory afterward.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-amber-400/40 bg-amber-950/40 p-3 text-sm text-amber-200">
            {error}
          </p>
        )}
        {recipeInventoryWarnings.length > 0 && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-amber-400/50 bg-amber-950/50 p-4 text-amber-100"
          >
            <p className="font-semibold">This recipe needs ingredients you don’t have enough of.</p>
            <p className="mt-1 text-sm">
              Add or select the missing inventory items before creating the batch.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {recipeInventoryWarnings.map((warning, index) => (
                <li key={`${index}:${warning}`}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        {enabled && secondaryInventoryRequirements.length > 0 && (
          <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Secondary additions</p>
            {secondaryInventoryRequirements.map((requirement) => (
              <InventoryIngredientSelect
                key={requirement.selectionKey}
                selectionKey={requirement.selectionKey}
                defaultValue={requirement.name}
                placeholder={requirement.subcategory ?? "Additive"}
                category={requirement.category}
                subcategory={requirement.subcategory}
                className="w-full rounded border border-white/20 bg-black/40 p-3"
              />
            ))}
          </div>
        )}
        {children}
        {enabled && (
          <div className="mt-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setShowInventoryCreator((current) => !current)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 font-semibold hover:bg-white/20"
            >
              {showInventoryCreator ? "Cancel adding inventory items" : "Add missing inventory items"}
            </button>
            {showInventoryCreator && (
              <InventoryItemCreator
                onAdded={() => setShowInventoryCreator(false)}
                onCancel={() => setShowInventoryCreator(false)}
              />
            )}
          </div>
        )}
        {inventoryIssues && typeof document !== "undefined" && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setInventoryIssues(null);
            }}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="recipe-inventory-title"
              className="w-full max-w-lg rounded-xl border border-amber-400/30 bg-zinc-900 p-6 shadow-2xl"
            >
              <h2 id="recipe-inventory-title" className="mb-3 text-xl font-bold">
                Recipe ingredients need attention
              </h2>
              <p className="mb-3 text-sm text-zinc-300">
                This batch has not been created. Match the recipe ingredients to inventory items
                and make sure there is enough stock, then try again.
              </p>
              <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-amber-200">
                {inventoryIssues.map((issue, index) => (
                  <li key={`${index}:${issue}`}>{issue}</li>
                ))}
              </ul>
              <div className="flex justify-end">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setInventoryIssues(null)}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
                >
                  Review ingredients
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}
      </div>
    </BatchInventoryContext.Provider>
  );
}

export function InventoryIngredientSelect({
  selectionKey,
  value,
  defaultValue,
  onChange,
  onItemSelect,
  name,
  placeholder,
  className,
  category,
  subcategory,
  subcategories,
  inventoryFilters,
  enabledOnly = false,
  trackAmount = false,
  amountFieldName,
  defaultAmount,
  defaultAmountUnit,
}: {
  selectionKey: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onItemSelect?: (item: InventoryItem | null) => void;
  name?: string;
  placeholder: string;
  className: string;
  category?: string;
  subcategory?: string;
  subcategories?: string[];
  inventoryFilters?: { category: string; subcategory?: string }[];
  enabledOnly?: boolean;
  trackAmount?: boolean;
  amountFieldName?: string;
  defaultAmount?: string;
  defaultAmountUnit?: string;
}) {
  const contextValue = useContext(BatchInventoryContext);
  if (!contextValue) {
    throw new Error("Inventory ingredient selector must be inside BatchInventoryProvider");
  }
  const {
    enabled,
    loaded,
    items,
    selections,
    setSelection,
    error,
  } = contextValue;
  const [localValue, setLocalValue] = useState(defaultValue ?? "");
  const [amount, setAmount] = useState("");
  const amountEdited = useRef(false);
  const currentValue = value ?? localValue;
  const normalizedValue = currentValue.trim().toLocaleLowerCase();
  const matchesInventoryFilter = useCallback((item: InventoryItem) =>
    inventoryFilters
      ? inventoryFilters.some(
          (filter) =>
            item.category === filter.category &&
            (!filter.subcategory ||
              item.subcategory?.toLocaleLowerCase() ===
                filter.subcategory.toLocaleLowerCase())
        )
      : (!category || item.category === category) &&
        (!subcategories ||
          subcategories.some((s) => item.subcategory?.toLowerCase() === s.toLowerCase())) &&
        (!subcategory || item.subcategory?.toLowerCase() === subcategory.toLowerCase()),
  [category, inventoryFilters, subcategories, subcategory]);

  useEffect(() => {
    if (value === undefined) setLocalValue(defaultValue ?? "");
  }, [defaultValue, value]);

  useEffect(() => {
    if (!enabled || selections[selectionKey] || !normalizedValue || !loaded) return;
    const candidates = items.filter(
      (item) =>
        item.name.trim().toLocaleLowerCase() === normalizedValue &&
        matchesInventoryFilter(item)
    );
    if (candidates.length === 1) setSelection(selectionKey, candidates[0].id);
  }, [
    enabled,
    items,
    loaded,
    selections,
    setSelection,
    selectionKey,
    matchesInventoryFilter,
    normalizedValue,
  ]);

  const options = items.filter(matchesInventoryFilter);
  const selected = items.find(
    (item) => item.id === selections[selectionKey]
  );
  const selectedId = selected?.id;
  const selectedUnit = selected?.unit;
  useEffect(() => {
    if (amountEdited.current || defaultAmount == null || !defaultAmount.trim()) return;
    const defaultValue = Number(defaultAmount.replace(",", "."));
    if (!Number.isFinite(defaultValue)) return;
    const converted = selectedId && defaultAmountUnit && selectedUnit
      ? convertIngredientAmount(defaultValue, defaultAmountUnit, selectedUnit)
      : defaultValue;
    if (converted !== null) setAmount(String(converted));
  }, [defaultAmount, defaultAmountUnit, selectedId, selectedUnit]);

  if (!enabled && enabledOnly) return null;

  if (!enabled) {
    return (
      <input
        placeholder={placeholder}
        className={className}
        name={name}
        value={currentValue}
        onChange={(event) => {
          setSelection(selectionKey, "");
          if (value === undefined) setLocalValue(event.target.value);
          onChange?.(event.target.value);
        }}
      />
    );
  }

  const inputClassName = className
    .replace(/\bbg-black\/40\b/g, "bg-zinc-900")
    .replace(/\bmin-w-\[\d+px\]/g, "")
    .replace(/\bflex-1\b/g, "");

  return (
    <>
      <div className="min-w-0 flex-1 basis-0 space-y-2 md:min-w-[170px]">
        <div className={trackAmount ? "grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,0.4fr)]" : ""}>
          {name && <input type="hidden" name={name} value={currentValue} />}
          <select
            aria-label={placeholder}
            value={selected?.id ?? ""}
            disabled={!loaded || !!error || options.length === 0}
            onChange={(event) => {
              const item = options.find((option) => option.id === event.target.value);
              if (trackAmount && item?.id !== selected?.id) setAmount("");
              setSelection(selectionKey, item?.id ?? "");
              if (value === undefined) setLocalValue(item?.name ?? "");
              onChange?.(item?.name ?? "");
              onItemSelect?.(item ?? null);
            }}
            className={`${inputClassName} min-h-[3.125rem] w-full disabled:opacity-60`}
          >
            <option value="">
              {error
                ? "Inventory unavailable"
                : !loaded
                  ? "Loading inventory…"
                  : options.length
                    ? `Select ${placeholder.toLowerCase()}`
                    : `No ${placeholder.toLowerCase()} in inventory`}
            </option>
            {options.map((item) => {
              const isLow = item.amount <= item.minimum_amount;
              return (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.amount} {item.unit} · {isLow ? "Low stock" : "In stock"}
                </option>
              );
            })}
          </select>
          {trackAmount && (
            <label className="flex items-center gap-2 rounded-lg border border-white/20 px-3">
              <input
                type="number"
                min="0"
                step="any"
                aria-label={`${placeholder} amount`}
                placeholder="Amount"
                value={amount}
                required={!!selected}
                disabled={!selected}
                onChange={(event) => {
                  amountEdited.current = true;
                  setAmount(event.target.value);
                }}
                className="min-w-0 w-full bg-transparent py-3 outline-none disabled:opacity-50"
              />
              <span className="whitespace-nowrap text-sm text-white/60">
                {selected?.unit ?? "unit"}
              </span>
            </label>
          )}
          {selected && (
            <span
              className={`mt-1 block text-xs ${
                selected.amount <= selected.minimum_amount
                  ? "text-amber-300"
                  : "text-green-300"
              }`}
            >
              {selected.amount <= selected.minimum_amount ? "Low stock" : "In stock"}:{" "}
              {selected.amount} {selected.unit} available
            </span>
          )}
        </div>
      </div>
      {trackAmount && !amountFieldName && (
        <input
          type="hidden"
          name="batch_measured_usage_json"
          value={JSON.stringify(
            selected ? [{ inventory_item_id: selected.id, amount }] : []
          )}
        />
      )}
      {trackAmount && amountFieldName && selected && (
        <input type="hidden" name={amountFieldName} value={amount} />
      )}
    </>
  );
}

export function InventoryPreferenceFallback({
  children,
}: {
  children: ReactNode;
}) {
  const context = useContext(BatchInventoryContext);
  if (!context) {
    throw new Error("Inventory fallback must be inside BatchInventoryProvider");
  }
  return context.enabled ? null : <>{children}</>;
}

function InventoryItemCreator({
  initialName = "",
  category: fixedCategory,
  subcategory: fixedSubcategory,
  onAdded,
  onCancel,
}: {
  initialName?: string;
  category?: string;
  subcategory?: string;
  onAdded: (item: InventoryItem) => void;
  onCancel: () => void;
}) {
  const context = useContext(BatchInventoryContext);
  if (!context) {
    throw new Error("Inventory item creator must be inside BatchInventoryProvider");
  }
  const inventoryContext = context;
  const initialCategory =
    fixedCategory ?? INVENTORY_CATEGORIES[0].id;
  const [itemName, setItemName] = useState(initialName);
  const [itemCategory, setItemCategory] = useState(initialCategory);
  const [itemSubcategory, setItemSubcategory] = useState(fixedSubcategory ?? "");
  const [stockAmount, setStockAmount] = useState("");
  const [minimumAmount, setMinimumAmount] = useState("");
  const [unit, setUnit] = useState("");
  const [alphaAcid, setAlphaAcid] = useState("");
  const [ebc, setEbc] = useState("");
  const [hopYear, setHopYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isHop = itemCategory === "hops";
  const isMalt = itemCategory === "malts";
  const selectedCategory = INVENTORY_CATEGORIES.find(
    (item) => item.id === itemCategory
  );

  async function saveItem() {
    if (!itemName.trim() || !stockAmount.trim() || !unit.trim() || !minimumAmount.trim()) {
      setError("Enter the item name, starting amount, minimum amount, and unit.");
      return;
    }
    if (/\bwater\b/i.test(itemName)) {
      setError("Water is not tracked as an inventory item.");
      return;
    }
    if (isHop && !alphaAcid.trim()) {
      setError("Enter the alpha acid percentage for this hop.");
      return;
    }
    if (isMalt && !ebc.trim()) {
      setError("Enter the EBC color value for this malt.");
      return;
    }
    const startingAmount = Number(stockAmount);
    const minimumStock = Number(minimumAmount);
    if (
      !Number.isFinite(startingAmount) ||
      startingAmount < 0 ||
      !Number.isFinite(minimumStock) ||
      minimumStock < 0
    ) {
      setError("Starting and minimum amounts must be zero or greater.");
      return;
    }
    const formData = new FormData();
    formData.set("name", itemName.trim());
    formData.set("category", itemCategory);
    formData.set("subcategory", itemSubcategory);
    formData.set("amount", String(startingAmount));
    formData.set("unit", unit.trim());
    formData.set("minimum_amount", String(minimumStock));
    if (isHop) formData.set("alpha_acid", alphaAcid);
    if (isMalt) formData.set("ebc", ebc);
    if (isHop && hopYear.trim()) formData.set("hop_year", hopYear);

    setSaving(true);
    setError("");
    try {
      const item = await inventoryContext.addItem(formData);
      onAdded(item);
    } catch (saveError) {
      console.error("Could not add inventory item during batch creation", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not add this item to inventory."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="grid gap-2 rounded-lg border border-white/15 bg-black/30 p-3 sm:grid-cols-2"
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          void saveItem();
        }
      }}
    >
      <input
        aria-label="New inventory item name"
        autoFocus
        required
        value={itemName}
        onChange={(event) => setItemName(event.target.value)}
        placeholder="Item name"
        className="rounded border border-white/20 bg-black/40 p-3"
      />
      {fixedCategory ? (
        <input
          aria-label="Inventory category"
          readOnly
          value={selectedCategory?.label ?? fixedCategory}
          className="rounded border border-white/20 bg-black/40 p-3 opacity-75"
        />
      ) : (
        <select
          aria-label="Inventory category"
          value={itemCategory}
          onChange={(event) => {
            setItemCategory(event.target.value);
            setItemSubcategory("");
          }}
          className="rounded border border-white/20 bg-zinc-900 p-3"
        >
          {INVENTORY_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      )}
      {fixedSubcategory ? (
        <input
          aria-label="Inventory subcategory"
          readOnly
          value={fixedSubcategory}
          className="rounded border border-white/20 bg-black/40 p-3 opacity-75"
        />
      ) : (
        !!selectedCategory?.subcategories.length && (
          <select
            aria-label="Inventory subcategory"
            value={itemSubcategory}
            onChange={(event) => setItemSubcategory(event.target.value)}
            className="rounded border border-white/20 bg-zinc-900 p-3"
          >
            <option value="">Choose a subcategory (optional)</option>
            {getInventorySubcategoryOptions(selectedCategory.id).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      )}
      <p className="text-xs text-white/60 sm:col-span-2">
        Enter the amount you currently have; you can then select how much this batch uses.
      </p>
      <label className="flex items-center gap-2 rounded border border-white/20 px-3">
        <input
          aria-label="Starting inventory amount"
          required
          type="number"
          min="0"
          step="any"
          value={stockAmount}
          onChange={(event) => setStockAmount(event.target.value)}
          placeholder="Starting amount"
          className="min-w-0 w-full bg-transparent py-3 outline-none"
        />
      </label>
      <input
        aria-label="Inventory unit"
        required
        value={unit}
        onChange={(event) => setUnit(event.target.value)}
        placeholder="Unit (kg, g, pcs...)"
        className="rounded border border-white/20 bg-black/40 p-3"
      />
      <input
        aria-label="Minimum stock amount"
        required
        type="number"
        min="0"
        step="any"
        value={minimumAmount}
        onChange={(event) => setMinimumAmount(event.target.value)}
        placeholder="Minimum stock amount"
        className="rounded border border-white/20 bg-black/40 p-3"
      />
      {isHop && (
        <input
          aria-label="Alpha acid percentage"
          required
          type="number"
          min="0"
          max="100"
          step="any"
          value={alphaAcid}
          onChange={(event) => setAlphaAcid(event.target.value)}
          placeholder="Alpha acid (%)"
          className="rounded border border-white/20 bg-black/40 p-3"
        />
      )}
      {isHop && (
        <input
          aria-label="Hop harvest year"
          type="number"
          min="1900"
          max="2200"
          step="1"
          value={hopYear}
          onChange={(event) => setHopYear(event.target.value)}
          placeholder="Harvest year (optional)"
          className="rounded border border-white/20 bg-black/40 p-3"
        />
      )}
      {isMalt && (
        <input
          aria-label="Color in EBC"
          required
          type="number"
          min="0"
          step="any"
          value={ebc}
          onChange={(event) => setEbc(event.target.value)}
          placeholder="Color (EBC)"
          className="rounded border border-white/20 bg-black/40 p-3"
        />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveItem()}
          className="rounded-lg border border-green-500 bg-green-700 px-4 py-2 font-semibold hover:bg-green-600 disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add to inventory"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-lg border border-white/20 px-4 py-2"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300 sm:col-span-2">
          {error}
        </p>
      )}
    </div>
  );
}

type BatchAdditive = {
  inventory_item_id: string;
  amount: string;
};

export function InventoryAdditiveFields({
  defaultValue = "",
}: {
  defaultValue?: string;
}) {
  const context = useContext(BatchInventoryContext);
  if (!context) {
    throw new Error("Inventory additive fields must be inside BatchInventoryProvider");
  }
  const [additives, setAdditives] = useState<BatchAdditive[]>(() => {
    const initial = parseRecipeAdditions(defaultValue);
    return initial.map((item) => ({ inventory_item_id: "", amount: item.amount }));
  });
  const [appliedDefault, setAppliedDefault] = useState<string | null>(null);
  const items = context.items.filter((item) =>
    isBatchAdditiveInventoryCategory(item.category, item.subcategory)
  );
  const selectedAdditives = additives
    .map((additive) => ({
      ...additive,
      item: items.find((item) => item.id === additive.inventory_item_id),
    }))
    .filter((additive) => additive.item);
  const additiveText = selectedAdditives
    .map(({ item, amount }) =>
      amount.trim() ? `${item?.name}: ${amount} ${item?.unit}` : item?.name ?? ""
    )
    .join("\n");
  const additiveUsage = additives.filter(
    (additive) => additive.inventory_item_id || additive.amount.trim()
  );

  function updateAdditive(index: number, changes: Partial<BatchAdditive>) {
    setAdditives((current) =>
      current.map((additive, additiveIndex) =>
        additiveIndex === index ? { ...additive, ...changes } : additive
      )
    );
  }

  useEffect(() => {
    if (!context.enabled || !context.loaded || appliedDefault === defaultValue) return;

    const initial = parseRecipeAdditions(defaultValue);
    setAdditives(
      initial.map((addition: AdditionItem) => {
        const matches = items.filter(
          (item) => item.name.trim().toLocaleLowerCase() === addition.name.trim().toLocaleLowerCase()
        );
        const item = matches.length === 1 ? matches[0] : undefined;
        const convertedAmount =
          item && addition.unit.trim() && Number.isFinite(Number(addition.amount))
            ? convertIngredientAmount(Number(addition.amount), addition.unit, item.unit)
            : null;
        return {
          inventory_item_id: item?.id ?? "",
          amount: convertedAmount === null
            ? addition.unit.trim() && item
              ? ""
              : addition.amount
            : String(convertedAmount),
        };
      })
    );
    setAppliedDefault(defaultValue);
  }, [appliedDefault, context.enabled, context.loaded, defaultValue, items]);

  if (!context.enabled) {
    return <RecipeAdditiveFields defaultValue={defaultValue} />;
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="additives" value={additiveText} />
      <input
        type="hidden"
        name="batch_additives_json"
        value={JSON.stringify(additiveUsage)}
      />
      {additives.map((additive, index) => {
        const selectedItem = items.find(
          (item) => item.id === additive.inventory_item_id
        );
        return (
          <div
            key={index}
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,0.4fr)_auto]"
          >
            <select
              aria-label={`Additive ${index + 1}`}
              value={additive.inventory_item_id}
              disabled={!context.loaded || !!context.error}
              onChange={(event) =>
                updateAdditive(index, {
                  inventory_item_id: event.target.value,
                })
              }
              className="min-w-0 rounded-lg border border-white/20 bg-zinc-900 p-3 disabled:opacity-60"
            >
              <option value="">
                {context.error
                  ? "Inventory unavailable"
                  : !context.loaded
                    ? "Loading additives…"
                    : "Select an additive"}
              </option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.amount} {item.unit} ·{" "}
                  {item.amount <= item.minimum_amount ? "Low stock" : "In stock"}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-white/20 px-3">
              <input
                type="number"
                min="0"
                step="any"
                aria-label={`Additive ${index + 1} amount`}
                placeholder="Amount"
                value={additive.amount}
                onChange={(event) =>
                  updateAdditive(index, { amount: event.target.value })
                }
                className="min-w-0 w-full bg-transparent py-3 outline-none"
              />
              <span className="whitespace-nowrap text-sm text-white/60">
                {selectedItem?.unit ?? "unit"}
              </span>
            </label>
            <button
              type="button"
              onClick={() =>
                setAdditives((current) =>
                  current.filter((_, additiveIndex) => additiveIndex !== index)
                )
              }
              className="rounded-lg border border-white/20 px-3 py-2 text-sm"
              aria-label={`Remove additive ${index + 1}`}
            >
              Remove
            </button>
            {selectedItem && (
              <span
                className={`text-xs sm:col-span-3 ${
                  selectedItem.amount <= selectedItem.minimum_amount
                    ? "text-amber-300"
                    : "text-green-300"
                }`}
              >
                {selectedItem.amount <= selectedItem.minimum_amount
                  ? "Low stock"
                  : "In stock"}
                : {selectedItem.amount} {selectedItem.unit} available
              </span>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() =>
          setAdditives((current) => [
            ...current,
            { inventory_item_id: "", amount: "" },
          ])
        }
        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
      >
        + Add additive
      </button>
    </div>
  );
}
