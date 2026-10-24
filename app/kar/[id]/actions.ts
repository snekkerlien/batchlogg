"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MALT_ALIASES } from "@/app/my-recipes/actions/data";
import {
  calcDryHopIBU,
  calcEBC,
  calcIBU,
} from "@/lib/brewing/beerCalculators";
import { convertIngredientAmount } from "@/lib/inventory/convertIngredientAmount";
import {
  isBatchAdditiveInventoryCategory,
  isFruitInventoryCategory,
} from "@/lib/inventory/categories";
import { parseSecondaryAdditions } from "@/lib/recipes/secondaryAdditions";
import { isBeerStyle } from "@/lib/brewing/beerStyles";
import { isBatchGuideDismissed } from "@/lib/brewing/batchGuide";
import { getRecipeLimitStatus, recipeLimitError } from "@/lib/recipes/limits";



// ---------------------------------------------------------
// 0. START NY BATCH
// ---------------------------------------------------------

type Fruit = { name: string; amount: string; unit: string };
type Malt = { name: string; amount: string; unit: string; ebc: string };
type Hop = {
  name: string;
  amount: string;
  unit: string;
  time: string;
  alpha: string;
  year: string;
  addition_type?: "boil" | "whirlpool";
  temperature?: string;
};
type DryHop = { name: string; amount: string; contact: string; alpha: string; year: string; };

type Ingredient = { name: string; amount: string; unit: string };

function normalizeInventoryName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}



export async function createBatch(formData: FormData) {
  const { supabase, serviceRole } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Ingen session – bruker ikke innlogget.");

  const userId = user.id;
  const karId = formData.get("kar") as string;

  if (!karId) throw new Error("Kar-ID mangler.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("use_inventory_for_batches")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile) {
    throw new Error("Could not load the inventory preference for this account.");
  }
  const { error: lifecycleSchemaError } = await supabase
    .from("batches")
    .select("recipe_id, recipe_snapshot")
    .limit(1);
  let lifecycleSchemaAvailable = true;
  if (lifecycleSchemaError) {
    if (["42703", "PGRST204"].includes(lifecycleSchemaError.code ?? "")) {
      console.warn("Batch lifecycle migration is required to link recipes to batches.");
      lifecycleSchemaAvailable = false;
    } else {
      throw new Error(
        `Could not verify batch lifecycle storage: ${lifecycleSchemaError.message}`
      );
    }
  }
  const recipeId = formData.get("recipe_id");
  const sourceRecipeId =
    typeof recipeId === "string" && recipeId.trim() ? recipeId.trim() : null;
  let recipeSnapshot: Record<string, unknown> | null = null;
  if (sourceRecipeId) {
    if (!lifecycleSchemaAvailable) {
      throw new Error("Apply the batch lifecycle migration before starting a batch from a recipe.");
    }
    const { data: sourceRecipe, error: sourceRecipeError } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", sourceRecipeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (sourceRecipeError) {
      throw new Error(`Could not verify the source recipe: ${sourceRecipeError.message}`);
    }
    if (!sourceRecipe) {
      throw new Error("The selected source recipe was not found.");
    }
    const snapshotFields = [
      "name",
      "type",
      "og",
      "fg",
      "abv",
      "volume",
      "malts",
      "hops",
      "dry_hops",
      "fruits",
      "ingredients",
      "steps",
      "yeast",
      "additives",
      "full_process",
      "notes",
      "secondary_additions",
      "secondary_notes",
      "juice_type",
      "sugar_amount",
      "honey_type",
      "honey_amount",
      "base_liquid",
      "base_liquid_amount",
      "boil_time",
      "boil_volume",
    ];
    recipeSnapshot = Object.fromEntries(
      snapshotFields
        .filter((field) => field in sourceRecipe)
        .map((field) => [field, sourceRecipe[field]])
    );
    recipeSnapshot.source_recipe_id = sourceRecipe.source_recipe_id ?? null;
    recipeSnapshot.recipe_id = sourceRecipe.id;
  }
  const inventoryBypassed =
    formData.get("inventory_bypass") === "true" &&
    sourceRecipeId !== null;
  const useInventory = profile.use_inventory_for_batches === true && !inventoryBypassed;
  let inventoryUsage: unknown[] = [];
  let inventorySelections: Record<string, string> = {};
  if (useInventory) {
    if (formData.get("inventory_load_error") === "true") {
      redirect(
        `/kar/${karId}?inventory_error=${encodeURIComponent(
          "Inventory could not be loaded. Refresh the page and try again."
        )}`
      );
    }
    try {
      const rawUsage = formData.get("inventory_usage_json");
      inventoryUsage = JSON.parse(typeof rawUsage === "string" ? rawUsage : "[]");
    } catch {
      throw new Error("Invalid inventory usage selection.");
    }
    if (!Array.isArray(inventoryUsage)) {
      throw new Error("Invalid inventory usage selection.");
    }
    try {
      const rawSelections = formData.get("inventory_item_selections_json");
      const parsedSelections = JSON.parse(
        typeof rawSelections === "string" ? rawSelections : "{}"
      );
      if (
        !parsedSelections ||
        typeof parsedSelections !== "object" ||
        Array.isArray(parsedSelections) ||
        Object.values(parsedSelections).some((id) => typeof id !== "string")
      ) {
        throw new Error("Invalid inventory item selections.");
      }
      inventorySelections = parsedSelections as Record<string, string>;
    } catch {
      throw new Error("Invalid inventory item selections.");
    }
    const validUsage = inventoryUsage.every((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const item = entry as Record<string, unknown>;
      const amount = Number(item.amount);
      return (
        typeof item.inventory_item_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          item.inventory_item_id
        ) &&
        typeof item.amount === "string" &&
        item.amount.trim() !== "" &&
        Number.isFinite(amount) &&
        amount > 0
      );
    });
    if (!validUsage) {
      redirect(`/kar/${karId}?inventory_error=${encodeURIComponent("Choose an inventory item and enter an amount greater than zero for every row.")}`);
    }
  }

  const { data: vessel, error: vesselError } = await supabase
    .from("kar")
    .select("id, user_id")
    .eq("id", karId)
    .maybeSingle();

  if (vesselError) {
    throw new Error(`Kunne ikke kontrollere karet: ${vesselError.message}`);
  }
  if (!vessel) throw new Error("Vessel not found or access denied.");

  const { data: activeBatch, error: activeBatchError } = await supabase
    .from("batches")
    .select("id")
    .eq("aktivt_kar", karId)
    .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"])
    .maybeSingle();

  if (activeBatchError) {
    throw new Error(`Kunne ikke kontrollere karets status: ${activeBatchError.message}`);
  }
  if (activeBatch) {
    throw new Error("Dette karet har allerede en aktiv batch.");
  }

  // Neste batchnummer, telt fra 1 per bruker
  const { data: userBatches, error: userBatchesError } = await supabase
    .from("batches")
    .select("batchnummer")
    .eq("user_id", userId);
  if (userBatchesError) {
    throw new Error(`Could not check existing batches: ${userBatchesError.message}`);
  }
  const isFirstBatch = (userBatches ?? []).length === 0;

  const nextNumber =
    Math.max(0, ...(userBatches ?? []).map((b) => Number(b.batchnummer) || 0)) + 1;
  const formattedBatchnummer = String(nextNumber).padStart(4, "0");

  // Base fields
  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const type = formData.get("type") as string;
  const beerSubtypeRaw = formData.get("beer_subtype");
  const beerSubtype =
    type === "Beer" && typeof beerSubtypeRaw === "string"
      ? beerSubtypeRaw
      : null;
  const beerStyleRaw = formData.get("beer_style");
  const beerStyle =
    type === "Beer" && isBeerStyle(beerStyleRaw) ? beerStyleRaw : null;
  const kitUrlRaw = formData.get("kit_url");
  let kitUrl: string | null = null;

  if (
    type === "Beer" &&
    !["all_grain", "fresh_wort_kit", "malt_extract_kit"].includes(
      beerSubtype ?? ""
    )
  ) {
    throw new Error("Choose a valid brewing method.");
  }
  if (type === "Beer" && !beerStyle) {
    throw new Error("Choose a valid beer style.");
  }
  if (
    type === "Beer" &&
    beerSubtype !== "all_grain" &&
    typeof kitUrlRaw === "string" &&
    kitUrlRaw.trim()
  ) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(kitUrlRaw.trim());
    } catch {
      throw new Error("Enter a valid kit link.");
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Kit links must use http or https.");
    }
    kitUrl = parsedUrl.toString();
  }

  if (!name || !volume_l || !startdato || !og) {
    throw new Error("Mangler obligatoriske felter.");
  }

  // Mead fields
  const honey_type = (formData.get("honey_type") as string) || "";
  let honey_amount = (formData.get("honey_amount") as string) || "";
  const yeast = (formData.get("yeast") as string) || "";

  // Base liquid is mead-only and defaults to plain water when left empty
  const base_liquid =
    type === "Mead"
      ? ((formData.get("base_liquid") as string) || "").trim() || "Water"
      : null;
  const baseLiquidAmountRaw = (formData.get("base_liquid_amount") as string) || "";
  const base_liquid_amount =
    type === "Mead" && baseLiquidAmountRaw.trim() !== "" && Number(baseLiquidAmountRaw) > 0
      ? Number(baseLiquidAmountRaw)
      : null;
  const fruits_json = formData.get("fruits_json") as string;
  const fruits: Fruit[] = fruits_json ? JSON.parse(fruits_json) : [];
  const secondaryAdditionsRaw = formData.get("secondary_additions");
  const secondary_additions =
    typeof secondaryAdditionsRaw === "string" ? secondaryAdditionsRaw : "";
  const secondaryNotesRaw = formData.get("secondary_notes");
  const secondary_notes =
    typeof secondaryNotesRaw === "string" ? secondaryNotesRaw : "";
  const parsedSecondaryAdditions = parseSecondaryAdditions(secondary_additions);

  // Cider fields
  const juice_type = (formData.get("juice_type") as string) || "";
  const sugar_amount = (formData.get("sugar_amount") as string) || "";

  // Braggot + Beer fields
  const malts_json = formData.get("malts_json") as string;
  const malts: Malt[] = malts_json ? JSON.parse(malts_json) : [];

  const hops_json = formData.get("hops_json") as string;
  const hops: Hop[] = hops_json ? JSON.parse(hops_json) : [];
  const dry_hops_json = formData.get("dry_hops_json") as string;
  const dryHops: DryHop[] = dry_hops_json ? JSON.parse(dry_hops_json) : [];


  // Resolve malt names → real malt names
const resolvedMalts = malts.map((m) => {
  const alias = MALT_ALIASES[m.name.toLowerCase()];
  return {
    ...m,
    name: alias || m.name,
  };
});

// Resolve hop names → real hop names
const resolvedHops = hops.map(h => ({
  ...h,
  alpha: Number(String(h.alpha).replace(",", ".")) || 0,
  year: Number(h.year) || null, // brukerens årstall
}));

const resolvedDryHops = dryHops.map(h => ({
  ...h,
  alpha: Number(String(h.alpha).replace(",", ".")) || 0,
  year: Number(h.year) || null,
}));

const hasValue = (value: unknown) =>
  typeof value === "string" ? value.trim() !== "" : value != null;
const validAlphaAcid = (value: unknown) => {
  const alpha = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(alpha) && alpha > 0 && alpha <= 100;
};
if (
  ((type === "Beer" && beerSubtype === "all_grain") || type === "Braggot") &&
  malts.some(
    (malt) =>
      (hasValue(malt.name) || hasValue(malt.amount)) &&
      (!hasValue(malt.ebc) ||
        !Number.isFinite(Number(String(malt.ebc).replace(",", "."))) ||
        Number(String(malt.ebc).replace(",", ".")) < 0)
  )
) {
  throw new Error("Enter a valid EBC value for every malt addition.");
}
if (
  ((type === "Beer" && beerSubtype === "all_grain") || type === "Braggot") &&
  hops.some(
    (hop) =>
      (hasValue(hop.name) || hasValue(hop.amount) || hasValue(hop.alpha)) &&
      !validAlphaAcid(hop.alpha)
  )
) {
  throw new Error("Enter an alpha-acid value between 0 and 100 for every hop addition.");
}
if (
  ((type === "Beer" && beerSubtype === "all_grain") || type === "Braggot") &&
  hops.some((hop) => {
    const hasAddition =
      hasValue(hop.name) || hasValue(hop.amount) || hasValue(hop.alpha);
    if (!hasAddition) return false;
    if (!hasValue(hop.time)) return true;
    return (
      hop.addition_type === "whirlpool" &&
      (!hasValue(hop.temperature) ||
        !Number.isFinite(Number(hop.temperature)) ||
        Number(hop.temperature) < 0 ||
        Number(hop.temperature) > 100)
    );
  })
) {
  throw new Error(
    "Enter a time for every hop addition and a whirlpool temperature between 0 and 100°C."
  );
}
if (
  (type === "Beer" || type === "Braggot") &&
  dryHops.some(
    (hop) =>
      (hasValue(hop.name) || hasValue(hop.amount)) && !validAlphaAcid(hop.alpha)
  )
) {
  throw new Error("Enter an alpha-acid value between 0 and 100 for every hop addition.");
}




  const boil_time = (formData.get("boil_time") as string) || "";

  const boil_volume_l = Number(formData.get("boil_volume_l") ?? formData.get("volume_l"));
  const manualIBURaw = formData.get("ibu");
  const manualEBCRaw = formData.get("ebc");
  const manualIBU = typeof manualIBURaw === "string" && manualIBURaw.trim()
    ? Number(manualIBURaw)
    : null;
  const manualEBC = typeof manualEBCRaw === "string" && manualEBCRaw.trim()
    ? Number(manualEBCRaw)
    : null;
  if (
    type === "Beer" &&
    beerSubtype === "fresh_wort_kit" &&
    (manualIBU === null ||
      !Number.isFinite(manualIBU) ||
      manualIBU < 0 ||
      manualEBC === null ||
      !Number.isFinite(manualEBC) ||
      manualEBC < 0)
  ) {
    throw new Error("Enter the IBU and EBC values shown on the fresh wort kit.");
  }

  // ⭐ Brewfather IBU/EBC for Beer + Braggot
let ibu = 0;
let ebc = 0;

if (type === "Beer" && beerSubtype === "fresh_wort_kit") {
  ibu = manualIBU!;
  ebc = manualEBC!;
} else if (type === "Beer" || type === "Braggot") {
  const ibuBoil = calcIBU(resolvedHops, og, volume_l, boil_volume_l || volume_l);
  const ebcResult = calcEBC(resolvedMalts, volume_l);

  ibu = ibuBoil + calcDryHopIBU(resolvedDryHops, volume_l);
  ebc = ebcResult.ebc;
}


  // Other fields
  const ingredients_json = formData.get("ingredients_json") as string;
  const ingredients: Ingredient[] = ingredients_json ? JSON.parse(ingredients_json) : [];

  if (useInventory) {
    let measuredUsage: unknown[];
    try {
      const rawMeasuredUsage = formData.get("batch_measured_usage_json");
      measuredUsage = JSON.parse(
        typeof rawMeasuredUsage === "string" ? rawMeasuredUsage : "[]"
      );
    } catch {
      throw new Error("Invalid measured ingredient usage.");
    }
    if (!Array.isArray(measuredUsage)) {
      throw new Error("Invalid measured ingredient usage.");
    }
    const validMeasuredUsage = measuredUsage.every((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const measured = entry as Record<string, unknown>;
      const amount = Number(measured.amount);
      return (
        typeof measured.inventory_item_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          measured.inventory_item_id
        ) &&
        typeof measured.amount === "string" &&
        measured.amount.trim() !== "" &&
        Number.isFinite(amount) &&
        amount > 0
      );
    });
    if (!validMeasuredUsage) {
      redirect(
        `/kar/${karId}?inventory_error=${encodeURIComponent(
          "Choose a yeast item and enter the amount you will use."
        )}`
      );
    }

    let batchAdditives: unknown[];
    try {
      const rawAdditives = formData.get("batch_additives_json");
      batchAdditives = JSON.parse(
        typeof rawAdditives === "string" ? rawAdditives : "[]"
      );
    } catch {
      throw new Error("Invalid batch additive usage.");
    }
    if (!Array.isArray(batchAdditives)) {
      throw new Error("Invalid batch additive usage.");
    }
    const validAdditives = batchAdditives.every((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const additive = entry as Record<string, unknown>;
      const amount = Number(additive.amount);
      return (
        typeof additive.inventory_item_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          additive.inventory_item_id
        ) &&
        typeof additive.amount === "string" &&
        additive.amount.trim() !== "" &&
        Number.isFinite(amount) &&
        amount > 0
      );
    });
    if (!validAdditives) {
      redirect(
        `/kar/${karId}?inventory_error=${encodeURIComponent(
          "Choose an additive and enter an amount greater than zero for each selected additive."
        )}`
      );
    }

    const { data: inventoryItems, error: inventoryError } = await supabase
      .from("inventory_items")
      .select("id, name, unit, category, subcategory, alpha_acid, ebc, hop_year")
      .eq("user_id", userId);
    if (inventoryError) {
      throw new Error(`Could not load inventory items: ${inventoryError.message}`);
    }

    const ingredientUses: {
      name: string;
      amount: number;
      unit: string;
      selectionKey: string;
      category?: string;
      subcategory?: string;
    }[] = [];
    const addIngredientUse = (
      name: unknown,
      amount: unknown,
      unit: unknown,
      selectionKey: string,
      category?: string,
      subcategory?: string
    ) => {
      if (typeof name === "string" && /\bwater\b/i.test(name)) return;
      if (typeof amount === "string" && amount.trim() === "") return;
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;
      ingredientUses.push({
        name: typeof name === "string" ? name : "",
        amount: numericAmount,
        unit: typeof unit === "string" ? unit : "kg",
        selectionKey,
        category,
        subcategory,
      });
    };

    const inventoryHoneyAmount = formData.get("inventory_honey_amount");
    const selectedHoneyId = inventorySelections.honey;
    const hasHoneyInventoryAmount =
      typeof inventoryHoneyAmount === "string" &&
      inventoryHoneyAmount.trim() !== "";
    if (selectedHoneyId || hasHoneyInventoryAmount) {
      const honeyItem = (inventoryItems ?? []).find(
        (item) =>
          item.id === selectedHoneyId &&
          item.category === "fermentables" &&
          item.subcategory?.toLocaleLowerCase() === "honey"
      );
      const amount = Number(inventoryHoneyAmount);
      if (
        !honeyItem ||
        !hasHoneyInventoryAmount ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        redirect(
          `/kar/${karId}?inventory_error=${encodeURIComponent(
            "Select a honey inventory item and enter the amount in the unit shown beside it."
          )}`
        );
      }
      const amountInKg = convertIngredientAmount(amount, honeyItem.unit, "kg");
      if (amountInKg === null) {
        redirect(
          `/kar/${karId}?inventory_error=${encodeURIComponent(
            `Honey inventory unit ${honeyItem.unit} cannot be converted to kilograms for the batch record.`
          )}`
        );
      }
      honey_amount = String(amountInKg);
      addIngredientUse(
        honey_type || honeyItem.name,
        amount,
        honeyItem.unit,
        "honey",
        "fermentables",
        "Honey"
      );
    } else if (honey_amount) {
      redirect(
        `/kar/${karId}?inventory_error=${encodeURIComponent(
          "Select a honey inventory item before entering its amount."
        )}`
      );
    }
    addIngredientUse("sugar", sugar_amount, "kg", "sugar", "fermentables", "Sugar");
    const inventoryJuiceAmount = formData.get("inventory_juice_amount");
    if ((type === "Cider" || type === "Wine") && (juice_type || inventoryJuiceAmount)) {
      const juiceItem = (inventoryItems ?? []).find(
        (item) => {
          if (item.id !== inventorySelections.juice) return false;
          if (item.category === "fermentables") {
            return item.subcategory?.toLocaleLowerCase() === "juice";
          }
          return type === "Wine" && isFruitInventoryCategory(item.category, item.subcategory);
        }
      );
      const juiceAmount = Number(inventoryJuiceAmount);
      if (
        !juiceItem ||
        typeof inventoryJuiceAmount !== "string" ||
        inventoryJuiceAmount.trim() === "" ||
        !Number.isFinite(juiceAmount) ||
        juiceAmount <= 0
      ) {
        redirect(
          `/kar/${karId}?inventory_error=${encodeURIComponent(
            "Select a juice inventory item and enter the amount in the unit shown beside it."
          )}`
        );
      }
      addIngredientUse(
        juice_type || juiceItem.name,
        juiceAmount,
        juiceItem.unit,
        "juice",
        juiceItem.category,
        juiceItem.subcategory ?? undefined
      );
    }
    for (const [index, malt] of malts.entries()) {
      addIngredientUse(malt.name, malt.amount, malt.unit || "kg", `malt:${index}`, "malts");
    }
    for (const [index, hop] of hops.entries()) {
      addIngredientUse(hop.name, hop.amount, hop.unit || "g", `hop:${index}`, "hops");
    }
    for (const [index, hop] of dryHops.entries()) {
      addIngredientUse(hop.name, hop.amount, "g", `dryhop:${index}`, "hops");
    }
    for (const [index, fruit] of fruits.entries()) {
      addIngredientUse(fruit.name, fruit.amount, fruit.unit, `fruit:${index}`, "fruit");
    }
    for (const [index, fruit] of parsedSecondaryAdditions.fruits.entries()) {
      addIngredientUse(
        fruit.name,
        fruit.amount,
        fruit.unit,
        `secondary-fruit:${index}`,
        "fruit"
      );
    }
    for (const [index, additive] of parsedSecondaryAdditions.additives.entries()) {
      addIngredientUse(
        additive.name,
        additive.amount,
        additive.unit,
        `secondary-additive:${index}`,
        "additives"
      );
    }
    for (const [index, ingredient] of ingredients.entries()) {
      addIngredientUse(
        ingredient.name,
        ingredient.amount,
        ingredient.unit,
        `ingredient:${index}`
      );
    }

    const autoUsage = new Map<string, number>();
    const matchedBySelectionKey = new Map<string, { alpha_acid?: number | null; ebc?: number | null; hop_year?: number | null }>();
    for (const ingredient of ingredientUses) {
      const selectedItemId = inventorySelections[ingredient.selectionKey];
      let matchingItems = selectedItemId
        ? (inventoryItems ?? []).filter(
            (item) => {
              const categoryMatches =
                ingredient.category === "fruit"
                  ? isFruitInventoryCategory(item.category, item.subcategory)
                  : !ingredient.category || item.category === ingredient.category;
              return (
                item.id === selectedItemId &&
                !/\bwater\b/i.test(item.name) &&
                categoryMatches &&
                (!ingredient.subcategory ||
                  item.subcategory?.toLocaleLowerCase() ===
                    ingredient.subcategory.toLocaleLowerCase())
              );
            }
          )
        : (inventoryItems ?? []).filter(
            (item) => {
              const categoryMatches =
                ingredient.category === "fruit"
                  ? isFruitInventoryCategory(item.category, item.subcategory)
                  : !ingredient.category || item.category === ingredient.category;
              return (
                normalizeInventoryName(item.name) === normalizeInventoryName(ingredient.name) &&
                !/\bwater\b/i.test(item.name) &&
                categoryMatches &&
                (!ingredient.subcategory ||
                  item.subcategory?.toLocaleLowerCase() ===
                    ingredient.subcategory.toLocaleLowerCase()) &&
                (!ingredient.unit ||
                  convertIngredientAmount(ingredient.amount, ingredient.unit, item.unit) !== null)
              );
            }
          );
      if (!selectedItemId && matchingItems.length === 0 && ingredient.subcategory) {
        const normalizedIngredient = normalizeInventoryName(ingredient.name);
        matchingItems = (inventoryItems ?? []).filter((item) => {
          const normalizedItemName = normalizeInventoryName(item.name);
          const sameSubcategory =
            item.subcategory?.toLocaleLowerCase() ===
            ingredient.subcategory?.toLocaleLowerCase();
          const sameCategory =
            ingredient.category === "fruit"
              ? isFruitInventoryCategory(item.category, item.subcategory)
              : !ingredient.category || item.category === ingredient.category;
          const isWater = /\bwater\b/i.test(item.name);
          const isGeneric = normalizedIngredient === "honey" || normalizedIngredient === "sugar";
          const nameMatches =
            normalizedItemName.includes(normalizedIngredient) ||
            normalizedIngredient.includes(normalizedItemName);
          return (
            sameCategory &&
            !isWater &&
            (isGeneric
              ? sameSubcategory || normalizedItemName.includes(normalizedIngredient)
              : nameMatches) &&
            (!ingredient.unit ||
              convertIngredientAmount(ingredient.amount, ingredient.unit, item.unit) !== null)
          );
        });
      }
      if (matchingItems.length !== 1) {
        redirect(
          `/kar/${karId}?inventory_error=${encodeURIComponent(
            `Select a matching inventory item for ${ingredient.name || "each batch ingredient"}.`
          )}`
        );
      }
      const item = matchingItems[0];
      const convertedAmount = ingredient.unit
        ? convertIngredientAmount(ingredient.amount, ingredient.unit, item.unit)
        : ingredient.amount;
      if (convertedAmount === null) {
        redirect(
          `/kar/${karId}?inventory_error=${encodeURIComponent(
            `The batch amount for ${ingredient.name} cannot be converted to the inventory unit (${item.unit}).`
          )}`
        );
      }
      autoUsage.set(item.id, (autoUsage.get(item.id) ?? 0) + convertedAmount);
      matchedBySelectionKey.set(ingredient.selectionKey, item);
    }

    if (
      (type === "Beer" && beerSubtype !== "fresh_wort_kit") ||
      type === "Braggot"
    ) {
      ibu =
        calcIBU(resolvedHops, og, volume_l, boil_volume_l || volume_l) +
        calcDryHopIBU(resolvedDryHops, volume_l);
      ebc = calcEBC(resolvedMalts, volume_l).ebc;
    }

    for (const entry of batchAdditives) {
      const additive = entry as { inventory_item_id: string; amount: string };
      const item = (inventoryItems ?? []).find(
        (inventoryItem) =>
          inventoryItem.id === additive.inventory_item_id &&
          isBatchAdditiveInventoryCategory(
            inventoryItem.category,
            inventoryItem.subcategory
          ) &&
          !/\bwater\b/i.test(inventoryItem.name)
      );
      if (!item) {
        redirect(
          `/kar/${karId}?inventory_error=${encodeURIComponent(
            "Choose a valid additive from your inventory. Water is not tracked."
          )}`
        );
      }
      autoUsage.set(
        item.id,
        (autoUsage.get(item.id) ?? 0) + Number(additive.amount)
      );
    }

    for (const entry of measuredUsage) {
      const measured = entry as { inventory_item_id: string; amount: string };
      const item = (inventoryItems ?? []).find(
        (inventoryItem) =>
          inventoryItem.id === measured.inventory_item_id &&
          inventoryItem.category === "yeast" &&
          !/\bwater\b/i.test(inventoryItem.name)
      );
      if (!item) {
        redirect(
          `/kar/${karId}?inventory_error=${encodeURIComponent(
            "Choose a valid yeast item from your inventory."
          )}`
        );
      }
      autoUsage.set(
        item.id,
        (autoUsage.get(item.id) ?? 0) + Number(measured.amount)
      );
    }

    const manualUsage = inventoryUsage
      .filter(
        (entry) =>
          !entry ||
          typeof entry !== "object" ||
          !("inventory_item_id" in entry) ||
          typeof entry.inventory_item_id !== "string" ||
          !autoUsage.has(entry.inventory_item_id)
      )
      .filter((entry) => {
        if (!entry || typeof entry !== "object" || !("inventory_item_id" in entry)) {
          return true;
        }
        const item = (inventoryItems ?? []).find(
          (inventoryItem) => inventoryItem.id === entry.inventory_item_id
        );
        return !item || !/\bwater\b/i.test(item.name);
      });

    const combinedUsage = [
      ...[...autoUsage.entries()].map(([inventory_item_id, amount]) => ({
        inventory_item_id,
        amount: String(amount),
      })),
      ...manualUsage,
    ];

    if (combinedUsage.length === 0) {
      redirect(
        `/kar/${karId}?inventory_error=${encodeURIComponent(
          "No inventory items were matched to this batch. Check that ingredient names match your inventory, or add the items in the inventory usage section."
        )}`
      );
    }
    inventoryUsage = combinedUsage;
  }

  const steps_json = formData.get("steps_json") as string;
  const steps: string[] = steps_json ? JSON.parse(steps_json) : [];

  // Shared fields
  const additives = (formData.get("additives") as string) || "";
  const full_process = (formData.get("full_process") as string) || "";
  const notes = (formData.get("notes") as string) || "";

  // ---------------------------------------------------------
  // Build recipe text (oppskrift)
  // ---------------------------------------------------------

  let oppskrift = "";

  // Mead
  if (type === "Mead") {
    oppskrift = `
Honey:
${honey_type} – ${honey_amount} kg

Fruits:
${fruits.map((f: Fruit) => `${f.name}: ${f.amount}${f.unit}`).join("\n")}

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
  }

  // Cider
  else if (type === "Cider") {
    oppskrift = `
Juice type:
${juice_type}

Sugar added:
${sugar_amount} kg

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
  }

  // Wine
  else if (type === "Wine") {
    oppskrift = `
Juice / Grape type:
${juice_type}

Sugar added:
${sugar_amount} kg

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
  }

  // Hard Seltzer
  else if (type === "Seltzer") {
    oppskrift = `
Sugar:
${sugar_amount} kg

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
  }

  // Braggot
  else if (type === "Braggot") {
    oppskrift = `
Malt additions:
${malts.map((m: Malt) => `${m.name}: ${m.amount}${m.unit}`).join("\n")}

Boil time:
${boil_time} min

Honey:
${honey_amount} kg

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
  }

  // Beer
else if (type === "Beer") {
  oppskrift = `
Malt additions:
${malts.map((m: Malt) => `${m.name}: ${m.amount}${m.unit}`).join("\n")}

Hop additions:
${hops
  .map((h: Hop) =>
    `${h.name}: ${h.amount}${h.unit} @ ${
      h.addition_type === "whirlpool"
        ? `whirlpool ${h.time} min at ${h.temperature}°C`
        : `${h.time} min boil`
    } (${h.alpha}% - ${h.year})`
  )
  .join("\n")}

Dry hop additions:
${dryHops
  .map(h => `${h.name}: ${h.amount}g (${h.alpha}% - ${h.year}) for ${h.contact} days`)
  .join("\n")}

Total boil time:
${boil_time} min

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
}

  // Other
  else if (type === "Other") {
    oppskrift = `
Ingredients:
${ingredients.map((i: Ingredient) => `${i.name}: ${i.amount}${i.unit}`).join("\n")}

Process steps:
${steps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}

Additives:
${additives}

Notes:
${notes}
`.trim();

  }

  // ---------------------------------------------------------
  // Insert batch
  // ---------------------------------------------------------

  const batchPayload = {
      batchnummer: formattedBatchnummer,
      aktivt_kar: karId,
      user_id: userId,
      ...(lifecycleSchemaAvailable
        ? { recipe_id: sourceRecipeId, recipe_snapshot: recipeSnapshot }
        : {}),
      name,
      volume_l,
      startdato,
      og,
      type,
      beer_subtype: beerSubtype,
      beer_style: beerStyle,
      kit_url: kitUrl,

      // Mead
      honey_type,
      honey_amount,
      fruits,

      base_liquid,
      base_liquid_amount,
      yeast,
      additives,
      full_process,
      notes,
      oppskrift,
      secondary_additions,
      secondary_notes,

      // Cider / Wine / Seltzer
      juice_type,
      sugar_amount,

      // Braggot / Beer
      malts: resolvedMalts,
      hops: resolvedHops,
      dry_hops: resolvedDryHops,
      boil_time,
      boil_volume_l,
      ibu,
      ebc,
      

      // Other
      ingredients,
      steps,

      status: "Aktiv",
    };

  let batch: any;
  if (useInventory && lifecycleSchemaAvailable) {
    const { data, error } = await supabase.rpc("create_batch_with_inventory", {
      p_batch: batchPayload,
      p_inventory_usage: inventoryUsage,
    });
    if (error) {
      if (error.message.includes("INSUFFICIENT_STOCK:")) {
        redirect(
          `/kar/${karId}?inventory_error=${encodeURIComponent(
            error.message.replace("INSUFFICIENT_STOCK:", "")
          )}`
        );
      }
      if (error.message.includes("NO_INVENTORY_USAGE")) {
        redirect(`/kar/${karId}?inventory_error=${encodeURIComponent("Add each inventory item used in this batch before creating it.")}`);
      }
      throw new Error(`Could not create batch with inventory: ${error.message}`);
    }
    batch = data?.batch;
    if (!batch?.id) throw new Error("Batch creation returned no batch record.");
    if (type === "Beer") {
      const { data: savedStyle, error: styleSaveError } = await supabase
        .from("batches")
        .update({
          beer_subtype: beerSubtype,
          beer_style: beerStyle,
          kit_url: kitUrl,
        })
        .eq("id", batch.id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (styleSaveError) {
        throw new Error(`Could not save the beer brewing method: ${styleSaveError.message}`);
      }
      if (!savedStyle) {
        throw new Error("Could not verify the saved beer brewing method.");
      }
    }
  } else {
    const { data, error } = await supabase
      .from("batches")
      .insert(batchPayload)
      .select()
      .single();
    if (error) throw new Error("Insert failed: " + error.message);
    batch = data;
  }

  if (useInventory) {
    const { data: linkedBatch, error: linkError } = await supabase
      .from("batches")
      .update({ recipe_id: sourceRecipeId })
      .eq("id", batch.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (linkError) {
      throw new Error(`Batch was created, but its source recipe could not be linked: ${linkError.message}`);
    }
    if (!linkedBatch) {
      throw new Error("Batch was created, but its source recipe link could not be verified.");
    }
  }

  const { error: sgError } = await serviceRole.from("sg_readings").insert({
    batch_id: batch.id,
    sg: og,
    created_at: startdato,
  });
  if (sgError) {
    throw new Error(`Could not save the initial SG reading: ${sgError.message}`);
  }

  if (!useInventory) {
    if (vessel.user_id === userId) {
      const { error: vesselUpdateError } = await supabase
        .from("kar")
        .update({ status: "Aktiv" })
        .eq("id", karId);
      if (vesselUpdateError) {
        throw new Error(`Could not update vessel status: ${vesselUpdateError.message}`);
      }
    }
  }

  revalidatePath(`/kar/${karId}`);
  const guideQuery =
    isFirstBatch && !isBatchGuideDismissed(user, "first-batch")
      ? "?guide=first-batch"
      : "";
  redirect(`/kar/${karId}${guideQuery}`);
}





// ---------------------------------------------------------
// 1. KANSELLER BATCH
// ---------------------------------------------------------
export async function cancelBatch(formData: FormData) {
  const { supabase } = supabaseServer();

  const batchId = formData.get("batch_id") as string;
  const karId = formData.get("kar_id") as string;

  if (!batchId || !karId) {
    throw new Error("Batch ID and vessel ID are required");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data: vessel, error: vesselError } = await supabase
    .from("kar")
    .select("id, user_id")
    .eq("id", karId)
    .maybeSingle();
  if (vesselError) throw new Error(`Could not verify vessel: ${vesselError.message}`);
  if (!vessel) throw new Error("Vessel not found or access denied");

  const { data: batch, error: batchLookupError } = await supabase
    .from("batches")
    .select("id")
    .eq("id", batchId)
    .eq("aktivt_kar", karId)
    .maybeSingle();

  if (batchLookupError) {
    throw new Error(`Could not verify batch: ${batchLookupError.message}`);
  }
  if (!batch) {
    throw new Error("Batch not found or access denied");
  }

  const { error: notesError } = await supabase
    .from("batch_notes")
    .delete()
    .eq("batch_id", batch.id);
  if (notesError) {
    throw new Error(`Could not delete batch notes: ${notesError.message}`);
  }

  const { data: deletedBatch, error: deleteBatchError } = await supabase
    .from("batches")
    .delete()
    .eq("id", batch.id)
    .select("id")
    .maybeSingle();
  if (deleteBatchError) {
    throw new Error(`Could not cancel batch: ${deleteBatchError.message}`);
  }
  if (!deletedBatch) {
    throw new Error("Could not cancel batch because it was not found or access was denied");
  }

  if (vessel.user_id === user.id) {
    const { error: updateKarError } = await supabase
      .from("kar")
      .update({ status: "Ledig" })
      .eq("id", karId);
    if (updateKarError) {
      throw new Error(`Could not update vessel status: ${updateKarError.message}`);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/kar/${karId}`);
  redirect(`/kar/${karId}?cancelled=${Date.now()}`);
}

// ---------------------------------------------------------
// 2. OVERFØR TIL SEKUNDÆR
// ---------------------------------------------------------
export async function moveToSecondary(formData: FormData) {
  const { supabase } = supabaseServer();

  const batchId = formData.get("batch_id") as string;
  const karId = formData.get("kar_id") as string;

  const additions = (formData.get("secondary_additions") as string) || "";
  const notes = (formData.get("secondary_notes") as string) || "";

  if (!batchId || !karId) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("id")
    .eq("id", batchId)
    .eq("aktivt_kar", karId)
    .eq("status", "Aktiv")
    .maybeSingle();
  if (batchError) throw new Error(`Could not verify batch: ${batchError.message}`);
  if (!batch) throw new Error("Batch not found or access denied");

  const { error: updateError } = await supabase
    .from("batches")
    .update({
      status: "secondary",
      secondary_startdate: new Date().toISOString(),
      secondary_additions: additions,
      secondary_notes: notes,
    })
    .eq("id", batchId)
    .eq("aktivt_kar", karId);
  if (updateError) throw new Error(`Could not rack batch: ${updateError.message}`);

  const { data: vessel } = await supabase
    .from("kar")
    .select("user_id")
    .eq("id", karId)
    .maybeSingle();
  if (vessel?.user_id === user.id) {
    const { error: vesselError } = await supabase
      .from("kar")
      .update({ status: "Sekundær" })
      .eq("id", karId);
    if (vesselError) {
      throw new Error(`Could not update vessel status: ${vesselError.message}`);
    }
  }

  revalidatePath(`/kar/${karId}`);
  revalidatePath("/dashboard");
  const guideQuery = isBatchGuideDismissed(user, "secondary")
    ? `?racked=${Date.now()}`
    : "?guide=secondary";
  redirect(`/kar/${karId}${guideQuery}`);
}

export async function rackToConditioning(formData: FormData) {
  const { supabase } = supabaseServer();

  const batchId = String(formData.get("batch_id") ?? "");
  const karId = String(formData.get("kar_id") ?? "");
  const notes = String(formData.get("conditioning_notes") ?? "").trim();
  if (!batchId || !karId) throw new Error("Batch ID and vessel ID are required");
  if (notes.length > 3000) throw new Error("Conditioning notes must be 3000 characters or fewer");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("id")
    .eq("id", batchId)
    .eq("aktivt_kar", karId)
    .in("status", ["Sekundær", "secondary"])
    .maybeSingle();
  if (batchError) throw new Error(`Could not verify batch: ${batchError.message}`);
  if (!batch) throw new Error("Batch not found or access denied");

  const { error: updateError } = await supabase
    .from("batches")
    .update({
      status: "Conditioning",
      conditioning_startdate: new Date().toISOString(),
      conditioning_notes: notes || null,
    })
    .eq("id", batchId)
    .eq("aktivt_kar", karId);
  if (updateError) {
    throw new Error(`Could not rack batch to conditioning: ${updateError.message}`);
  }

  const { data: vessel, error: vesselError } = await supabase
    .from("kar")
    .select("user_id")
    .eq("id", karId)
    .maybeSingle();
  if (vesselError) throw new Error(`Could not load vessel: ${vesselError.message}`);
  if (vessel?.user_id === user.id) {
    const { error: updateVesselError } = await supabase
      .from("kar")
      .update({ status: "Conditioning" })
      .eq("id", karId);
    if (updateVesselError) {
      throw new Error(`Could not update vessel status: ${updateVesselError.message}`);
    }
  }

  revalidatePath(`/kar/${karId}`);
  revalidatePath("/dashboard");
  const guideQuery = isBatchGuideDismissed(user, "conditioning")
    ? `?racked=${Date.now()}`
    : "?guide=conditioning";
  redirect(`/kar/${karId}${guideQuery}`);
}

const conditioningEntryTypes = [
  "rack",
  "clarify",
  "mature",
  "stabilize",
  "backsweeten",
  "adjustment",
  "taste",
  "other",
] as const;

type ConditioningEntryType = (typeof conditioningEntryTypes)[number];

const conditioningEntryFields: Record<ConditioningEntryType, string[]> = {
  rack: ["from_vessel", "to_vessel", "volume", "gravity"],
  clarify: ["agent", "amount", "unit", "contact_time"],
  mature: ["vessel", "temperature", "target_date"],
  stabilize: ["product", "amount", "unit", "wait_hours"],
  backsweeten: ["sweetener", "amount", "unit", "gravity"],
  adjustment: ["adjustment", "amount", "unit"],
  taste: ["aroma", "flavor", "next_step"],
  other: ["description"],
};

const requiredConditioningEntryFields: Partial<
  Record<ConditioningEntryType, string[]>
> = {
  rack: ["to_vessel"],
  clarify: ["agent"],
  stabilize: ["product"],
  backsweeten: ["sweetener"],
  adjustment: ["adjustment"],
  other: ["description"],
};

export async function addConditioningEntry(
  batchId: string,
  karId: string,
  formData: FormData
) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  if (!batchId || !karId) throw new Error("Batch ID and vessel ID are required");

  const type = String(formData.get("entry_type") ?? "");
  if (!conditioningEntryTypes.includes(type as ConditioningEntryType)) {
    throw new Error("Choose a valid conditioning action");
  }
  const entryType = type as ConditioningEntryType;
  const occurredAt = String(formData.get("occurred_at") ?? "");
  const selectedTime = new Date(`${occurredAt}:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(occurredAt) ||
    Number.isNaN(selectedTime.getTime()) ||
    selectedTime.toISOString().slice(0, 16) !== occurredAt
  ) {
    throw new Error("Enter a valid conditioning date and time");
  }
  const timezoneOffset = Number(formData.get("timezone_offset_minutes"));
  if (!Number.isInteger(timezoneOffset) || Math.abs(timezoneOffset) > 14 * 60) {
    throw new Error("Could not determine the time zone for this entry");
  }
  const occurredDate = new Date(selectedTime.getTime() + timezoneOffset * 60_000);
  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > 3000) throw new Error("Notes must be 3000 characters or fewer");

  const details: Record<string, string> = {};
  for (const field of conditioningEntryFields[entryType]) {
    const value = String(formData.get(field) ?? "").trim();
    if (value.length > 200) throw new Error("Conditioning details must be 200 characters or fewer");
    if (value) details[field] = value;
  }
  for (const field of requiredConditioningEntryFields[entryType] ?? []) {
    if (!details[field]) throw new Error(`Enter ${field.replace(/_/g, " ")}`);
  }

  for (const field of ["amount", "volume", "gravity", "temperature", "wait_hours"]) {
    const value = details[field];
    if (value === undefined) continue;
    const number = Number(value);
    if (
      !Number.isFinite(number) ||
      (field !== "temperature" && number < 0) ||
      (field !== "wait_hours" && field !== "temperature" && number === 0)
    ) {
      throw new Error(`Enter a valid ${field.replace("_", " ")}`);
    }
  }
  if (details.target_date) {
    const targetDate = new Date(`${details.target_date}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(details.target_date) ||
      Number.isNaN(targetDate.getTime()) ||
      targetDate.toISOString().slice(0, 10) !== details.target_date
    ) {
      throw new Error("Enter a valid target tasting date");
    }
  }

  const { data: batch, error: batchError } = await serviceRole
    .from("batches")
    .select("id, user_id, aktivt_kar, status")
    .eq("id", batchId)
    .eq("aktivt_kar", karId)
    .maybeSingle();
  if (batchError) throw new Error(`Could not verify batch: ${batchError.message}`);
  if (!batch || batch.status !== "Conditioning") {
    throw new Error("Conditioning entries can only be added to a batch in conditioning");
  }

  const { data: vessel, error: vesselError } = await serviceRole
    .from("kar")
    .select("user_id")
    .eq("id", karId)
    .maybeSingle();
  if (vesselError) throw new Error(`Could not verify vessel: ${vesselError.message}`);
  if (!vessel) throw new Error("Vessel not found");

  let hasAccess = vessel.user_id === user.id;
  if (!hasAccess) {
    const { data: contribution, error: contributionError } = await serviceRole
      .from("kar_contributors")
      .select("kar_id")
      .eq("kar_id", karId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (contributionError) {
      throw new Error(`Could not verify vessel access: ${contributionError.message}`);
    }
    hasAccess = !!contribution;
  }
  if (!hasAccess) throw new Error("You do not have permission to update this vessel");

  const { error: insertError } = await serviceRole
    .from("batch_conditioning_entries")
    .insert({
      batch_id: batch.id,
      user_id: batch.user_id,
      created_by: user.id,
      entry_type: entryType,
      occurred_at: occurredDate.toISOString(),
      details,
      notes: notes || null,
    });
  if (insertError) {
    throw new Error(`Could not save conditioning entry: ${insertError.message}`);
  }

  revalidatePath(`/kar/${karId}`);
  return { success: true };
}

// ---------------------------------------------------------
// FLYTT BATCH TIL ANNET KAR
// ---------------------------------------------------------
export async function moveBatchToVessel(formData: FormData) {
  const { supabase } = supabaseServer();

  const batchId = formData.get("batch_id") as string;
  const karId = formData.get("kar_id") as string;
  const targetKarId = formData.get("target_kar_id") as string;

  if (!batchId || !karId || !targetKarId || karId === targetKarId) {
    throw new Error("Batch, current vessel and a different target vessel are required");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: batch } = await supabase
    .from("batches")
    .select("id, status")
    .eq("id", batchId)
    .eq("aktivt_kar", karId)
    .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"])
    .maybeSingle();
  if (!batch) throw new Error("Batch not found or access denied");

  const { data: target } = await supabase
    .from("kar")
    .select("id, user_id")
    .eq("id", targetKarId)
    .maybeSingle();
  if (!target) throw new Error("Target vessel not found");

  const { data: occupied } = await supabase
    .from("batches")
    .select("id")
    .eq("aktivt_kar", targetKarId)
    .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"])
    .limit(1);
  if (occupied && occupied.length > 0) {
    throw new Error("Target vessel is not empty");
  }

  const { error } = await supabase
    .from("batches")
    .update({ aktivt_kar: targetKarId })
    .eq("id", batchId)
    .eq("aktivt_kar", karId);
  if (error) throw new Error(`Could not move batch: ${error.message}`);

  if (target.user_id === user.id) {
    const karStatus =
      batch.status === "Aktiv"
        ? "Aktiv"
        : batch.status === "Conditioning"
          ? "Conditioning"
          : "Sekundær";
    const { error: targetStatusError } = await supabase
      .from("kar")
      .update({ status: karStatus })
      .eq("id", targetKarId);
    if (targetStatusError) {
      throw new Error(`Could not update target vessel status: ${targetStatusError.message}`);
    }
  }
  const { data: source } = await supabase
    .from("kar")
    .select("user_id")
    .eq("id", karId)
    .maybeSingle();
  if (source?.user_id === user.id) {
    const { error: sourceStatusError } = await supabase
      .from("kar")
      .update({ status: "Ledig" })
      .eq("id", karId);
    if (sourceStatusError) {
      throw new Error(`Could not update source vessel status: ${sourceStatusError.message}`);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/kar/${karId}`);
  revalidatePath(`/kar/${targetKarId}`);
  redirect(`/kar/${targetKarId}`);
}

// ---------------------------------------------------------
// 3. AVSLUTT BATCH
// ---------------------------------------------------------
export async function finishBatch(formData: FormData) {
  const { supabase, serviceRole } = supabaseServer();

  const batchId = formData.get("batch_id") as string;
  const karId = formData.get("kar_id") as string;

  const fgRaw = formData.get("fg") as string;
  const finished_notes = (formData.get("finished_notes") as string) || "";
  const tasting_notes = (formData.get("tasting_notes") as string) || "";
  let saveRecipe = formData.get("save_as_recipe") === "on";
  let recipeLimitReached = false;
  const packagedVolumeRaw = formData.get("packaged_volume_l");
  const packagingMethod = String(formData.get("packaging_method") ?? "").trim();
  const bottleVolumeRaw = formData.get("bottle_volume_l");
  const kegVolumeRaw = formData.get("keg_volume_l");
  const packageCountRaw = formData.get("package_count");
  const carbonationMethod = String(formData.get("carbonation_method") ?? "").trim();
  const carbonationVolumesRaw = formData.get("target_carbonation_volumes");
  const primingSugarRaw = formData.get("priming_sugar_g");

  if (!batchId || !karId) {
    throw new Error("Batch ID and vessel ID are required");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  if (saveRecipe) {
    const limitStatus = await getRecipeLimitStatus(serviceRole, user.id);
    if (!limitStatus.isPremium && recipeLimitError(limitStatus.count)) {
      saveRecipe = false;
      recipeLimitReached = true;
    }
  }

  const fg = Number(fgRaw);
  if (!Number.isFinite(fg) || fg <= 0) {
    throw new Error("Enter a valid final gravity before finishing the batch");
  }

  const packagedVolume = Number(packagedVolumeRaw);
  if (!Number.isFinite(packagedVolume) || packagedVolume <= 0) {
    throw new Error("Enter a valid finished volume before finishing the batch");
  }
  const allowedPackagingMethods = new Set([
    "Bottles",
    "Keg",
    "Cans",
    "Mixed packaging",
    "Other",
  ]);
  if (!allowedPackagingMethods.has(packagingMethod)) {
    throw new Error("Select a valid bottling or storage method before finishing the batch");
  }

  function optionalNumber(value: FormDataEntryValue | null, label: string) {
    if (typeof value !== "string" || value.trim() === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`Enter a valid ${label}`);
    }
    return parsed;
  }

  const bottleVolume = optionalNumber(bottleVolumeRaw, "bottled volume");
  const kegVolume = optionalNumber(kegVolumeRaw, "kegged volume");
  if (
    bottleVolume !== null &&
    kegVolume !== null &&
    bottleVolume + kegVolume > packagedVolume + 0.01
  ) {
    throw new Error("Bottled and kegged volumes cannot exceed the finished volume");
  }

  const packageCount =
    typeof packageCountRaw === "string" && packageCountRaw.trim() !== ""
      ? Number(packageCountRaw)
      : null;
  if (
    packageCount !== null &&
    (!Number.isInteger(packageCount) || packageCount < 1)
  ) {
    throw new Error("Enter a valid container count");
  }

  const targetCarbonationVolumes = optionalNumber(
    carbonationVolumesRaw,
    "target carbonation"
  );
  if (
    targetCarbonationVolumes !== null &&
    (targetCarbonationVolumes < 0.1 || targetCarbonationVolumes > 6)
  ) {
    throw new Error("Target carbonation must be between 0.1 and 6 volumes of CO₂");
  }
  const primingSugarG = optionalNumber(primingSugarRaw, "priming sugar amount");
  const allowedCarbonationMethods = new Set([
    "",
    "Bottle conditioned",
    "Force carbonated",
    "Naturally carbonated",
    "Still",
    "Other",
  ]);
  if (!allowedCarbonationMethods.has(carbonationMethod)) {
    throw new Error("Select a valid carbonation method");
  }

  // Fetch batch
  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .eq("aktivt_kar", karId)
    .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"])
    .maybeSingle();

  if (batchError) {
    throw new Error(`Could not load batch to finish: ${batchError.message}`);
  }
  if (!batch) throw new Error("Batch not found");

  const { error: lifecycleSchemaError } = await supabase
    .from("batches")
    .select(
      "packaged_volume_l, packaging_method, bottle_volume_l, keg_volume_l, package_count, carbonation_method, target_carbonation_volumes, priming_sugar_g, tasting_notes, packaged_at"
    )
    .eq("id", batchId)
    .maybeSingle();
  if (lifecycleSchemaError) {
    if (["42703", "PGRST204"].includes(lifecycleSchemaError.code ?? "")) {
      throw new Error(
        "Finish & Bottle is unavailable until the batch lifecycle database migration is applied."
      );
    }
    throw new Error(
      `Could not verify Finish & Bottle storage: ${lifecycleSchemaError.message}`
    );
  }

  // Calculate ABV
  const abv = (batch.og - fg) * 131.25;

  // Fetch batch notes
  const { data: batchNotes } = await supabase
    .from("batch_notes")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  // Update batch
  const { data: updatedBatch, error: updateBatchError } = await supabase
    .from("batches")
    .update({
      status: "finished",
      fg,
      abv,
      finished_notes,
      packaged_volume_l: packagedVolume,
      packaging_method: packagingMethod,
      bottle_volume_l: bottleVolume,
      keg_volume_l: kegVolume,
      package_count: packageCount,
      carbonation_method: carbonationMethod || null,
      target_carbonation_volumes: targetCarbonationVolumes,
      priming_sugar_g: primingSugarG,
      tasting_notes: tasting_notes.trim() || null,
      packaged_at: new Date().toISOString(),
      finished_date: new Date().toISOString(),
      save_as_recipe: saveRecipe,
    })
    .eq("id", batchId)
    .eq("aktivt_kar", karId)
    .select("id")
    .maybeSingle();
  if (updateBatchError) {
    throw new Error(`Could not finish batch: ${updateBatchError.message}`);
  }
  if (!updatedBatch) {
    throw new Error("Could not finish batch because it was not found or access was denied");
  }

  // Free vessel
  const { data: vessel, error: vesselError } = await supabase
    .from("kar")
    .select("id, user_id")
    .eq("id", karId)
    .maybeSingle();
  if (vesselError) {
    throw new Error(`Could not load vessel: ${vesselError.message}`);
  }
  if (!vessel) {
    throw new Error("Could not find the vessel to free");
  }
  if (vessel.user_id === user.id) {
    const { error: updateKarError } = await supabase
      .from("kar")
      .update({ status: "Ledig" })
      .eq("id", karId);
    if (updateKarError) {
      throw new Error(`Could not free vessel: ${updateKarError.message}`);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/kar/${karId}`);

  // SAVE AS RECIPE
  if (saveRecipe) {
    const { data: savedRecipe, error: recipeError } = await supabase
      .from("recipes")
      .insert({
      user_id: user.id,
      batch_id: batch.id,

      // Core
      type: batch.type,
      name: batch.name,
      og: batch.og,
      fg,
      abv,
      volume: batch.volume_l,

      // Mead
      honey_type: batch.honey_type,
      honey_amount: batch.honey_amount,
      base_liquid: batch.base_liquid,
      base_liquid_amount: batch.base_liquid_amount,
      fruits: batch.fruits,

      // Wine / Cider / Seltzer
      juice_type: batch.juice_type,
      sugar_amount: batch.sugar_amount,

      // Beer / Braggot
      malts: batch.malts,
      hops: batch.hops,
      boil_time: batch.boil_time,
      ibu: batch.ibu,
      ebc: batch.ebc,

      // Other
      ingredients:
        batch.type === "Beer"
          ? {
              beer_subtype: batch.beer_subtype,
              beer_style: batch.beer_style,
              kit_url: batch.kit_url,
            }
          : batch.ingredients,
      steps: batch.steps,

      // Shared
      yeast: batch.yeast,
      additives: batch.additives,
      full_process: batch.full_process,
      notes: batch.notes,

      // Secondary
      had_secondary: batch.secondary_startdate ? true : false,
      secondary_additions: batch.secondary_additions,
      secondary_notes: batch.secondary_notes,

      // Notes log
      notes_log: batchNotes ?? [],

      is_public: false,
      })
      .select("id")
      .single();
    if (recipeError) {
      if (recipeError.code === "23514" && recipeError.message.includes("Free accounts can save")) {
        recipeLimitReached = true;
        const { error: batchRecipeFlagError } = await supabase
          .from("batches")
          .update({ save_as_recipe: false })
          .eq("id", batch.id)
          .eq("user_id", user.id);
        if (batchRecipeFlagError) {
          throw new Error(
            `Batch was finished, but the recipe limit was reached and the batch could not be updated: ${batchRecipeFlagError.message}`
          );
        }
      } else {
        throw new Error(`Batch was finished, but its recipe could not be saved: ${recipeError.message}`);
      }
    }
    if (!recipeLimitReached && !savedRecipe) {
      throw new Error("Batch was finished, but the saved recipe could not be verified.");
    }

    if (!recipeLimitReached && savedRecipe) {
      const { data: linkedBatch, error: linkError } = await supabase
        .from("batches")
        .update({ recipe_id: savedRecipe.id })
        .eq("id", batch.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      if (linkError) {
        throw new Error(`Recipe was saved, but could not be linked to its batch: ${linkError.message}`);
      }
      if (!linkedBatch) {
        throw new Error("Recipe was saved, but its batch link could not be verified.");
      }
    }
  }

  const searchParams = new URLSearchParams();
  if (!isBatchGuideDismissed(user, "bottling")) {
    searchParams.set("guide", "bottling");
  }
  if (recipeLimitReached) {
    searchParams.set("recipeLimit", "reached");
  }
  const query = searchParams.toString();
  redirect(
    `/brew-insights/${encodeURIComponent(batchId)}${query ? `?${query}` : ""}`
  );
}


// ---------------------------------------------------------
// 4. OPPDATER AKTIV BATCH  ⭐ NY FUNKSJON
// ---------------------------------------------------------
function parseJsonArray<T>(
  formData: FormData,
  field: string,
  parseRow: (row: Record<string, unknown>) => T
): T[] {
  const raw = formData.get(field);
  if (typeof raw !== "string") {
    throw new Error(`Missing ${field} batch data.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid ${field} batch data.`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid ${field} batch data.`);
  }

  return parsed.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Invalid ${field} batch data.`);
    }
    return parseRow(value as Record<string, unknown>);
  });
}

function formValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function parseMaltRow(row: Record<string, unknown>): Malt {
  return {
    name: formValue(row.name),
    amount: formValue(row.amount),
    unit: formValue(row.unit) || "kg",
    ebc: formValue(row.ebc),
  };
}

function parseHopRow(row: Record<string, unknown>): Hop {
  const additionType = row.addition_type === "whirlpool" ? "whirlpool" : "boil";
  return {
    name: formValue(row.name),
    amount: formValue(row.amount),
    unit: formValue(row.unit) || "g",
    time: formValue(row.time ?? row.boil),
    alpha: formValue(row.alpha),
    year: formValue(row.year),
    addition_type: additionType,
    temperature: formValue(row.temperature),
  };
}

function parseDryHopRow(row: Record<string, unknown>): DryHop {
  return {
    name: formValue(row.name),
    amount: formValue(row.amount),
    contact: formValue(row.contact),
    alpha: formValue(row.alpha),
    year: formValue(row.year),
  };
}

function parseIngredientRow(row: Record<string, unknown>): Ingredient {
  return {
    name: formValue(row.name),
    amount: formValue(row.amount),
    unit: formValue(row.unit),
  };
}

function parseJsonStrings(formData: FormData, field: string): string[] {
  const raw = formData.get(field);
  if (typeof raw !== "string") {
    throw new Error(`Missing ${field} batch data.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid ${field} batch data.`);
  }
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
    throw new Error(`Invalid ${field} batch data.`);
  }
  return parsed;
}

type SGReadingChange =
  | { type: "updated"; id: string; previousSg: number }
  | { type: "inserted"; id: string };

async function rollbackSGReadingChange(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  batchId: string,
  change: SGReadingChange | null
) {
  if (!change) return;

  const rollback =
    change.type === "updated"
      ? await serviceRole
          .from("sg_readings")
          .update({ sg: change.previousSg })
          .eq("id", change.id)
          .eq("batch_id", batchId)
      : await serviceRole
          .from("sg_readings")
          .delete()
          .eq("id", change.id)
          .eq("batch_id", batchId);

  if (rollback.error) {
    console.error("Could not roll back SG reading after batch update failed", rollback.error);
  }
}

export async function updateBatch(formData: FormData) {
  const { supabase, serviceRole } = supabaseServer();

  const batchId = formData.get("batch_id") as string;
  const karId = formData.get("kar_id") as string;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = formData.get("name");
  const volume_l = Number(formData.get("volume_l"));
  const og = Number(formData.get("og"));
  const startdato = formData.get("startdato");

  if (!user) throw new Error("Authentication required");
  if (!batchId || !karId) {
    throw new Error("Batch ID and vessel ID are required");
  }
  if (
    typeof name !== "string" ||
    !name.trim() ||
    !Number.isFinite(volume_l) ||
    volume_l <= 0 ||
    !Number.isFinite(og) ||
    og <= 1 ||
    typeof startdato !== "string" ||
    !Number.isFinite(new Date(startdato).getTime())
  ) {
    throw new Error("Enter a valid batch name, volume, start date, and original gravity.");
  }

  const { data: batch, error: batchLookupError } = await supabase
    .from("batches")
    .select("id, user_id, type, fg, dry_hops, og")
    .eq("id", batchId)
    .eq("aktivt_kar", karId)
    .maybeSingle();
  if (batchLookupError) {
    throw new Error(`Could not verify batch: ${batchLookupError.message}`);
  }
  if (!batch) throw new Error("Batch not found or access denied");

  const typeUpdates: Record<string, unknown> = {};

  if (batch.type === "Beer" || batch.type === "Braggot") {
    const malts = parseJsonArray(formData, "malts_json", parseMaltRow);
    const hops = parseJsonArray(formData, "hops_json", parseHopRow);
    const dryHops = formData.has("dry_hops_json")
      ? parseJsonArray(formData, "dry_hops_json", parseDryHopRow)
      : Array.isArray(batch.dry_hops)
        ? batch.dry_hops.map((row) => {
            if (!row || typeof row !== "object" || Array.isArray(row)) {
              throw new Error("Invalid saved dry-hop additions.");
            }
            return parseDryHopRow(row as Record<string, unknown>);
          })
        : [];

    if (
      malts.some((malt) => {
        const hasAddition = malt.name.trim() !== "" || malt.amount.trim() !== "";
        const ebc = Number(malt.ebc);
        return hasAddition && (!malt.ebc.trim() || !Number.isFinite(ebc) || ebc < 0);
      })
    ) {
      throw new Error("Enter a valid EBC value for every malt addition.");
    }

    if (
      hops.some((hop) => {
        const hasAddition =
          hop.name.trim() !== "" || hop.amount.trim() !== "" || hop.alpha.trim() !== "";
        const alpha = Number(hop.alpha.replace(",", "."));
        if (!hasAddition) return false;
        if (!Number.isFinite(alpha) || alpha <= 0 || alpha > 100) return true;
        if (!hop.time.trim()) return true;
        return hop.addition_type === "whirlpool" &&
          (!(hop.temperature ?? "").trim() ||
            !Number.isFinite(Number(hop.temperature)) ||
            Number(hop.temperature) < 0 ||
            Number(hop.temperature) > 100);
      })
    ) {
      throw new Error(
        "Enter hop alpha acid and time, plus a whirlpool temperature between 0 and 100°C."
      );
    }

    if (
      dryHops.some((hop) => {
        const hasAddition = hop.name.trim() !== "" || hop.amount.trim() !== "";
        const alpha = Number(hop.alpha.replace(",", "."));
        return hasAddition && (!Number.isFinite(alpha) || alpha <= 0 || alpha > 100);
      })
    ) {
      throw new Error("Enter an alpha-acid value between 0 and 100 for every dry-hop addition.");
    }

    const normalizedMalts = malts.map((malt) => ({
      ...malt,
      name: MALT_ALIASES[malt.name.toLowerCase()] || malt.name,
    }));
    const normalizedHops = hops.map((hop) => ({
      ...hop,
      alpha: hop.alpha.replace(",", "."),
    }));
    const normalizedDryHops = dryHops.map((hop) => ({
      ...hop,
      alpha: hop.alpha.replace(",", "."),
    }));

    typeUpdates.malts = normalizedMalts;
    typeUpdates.hops = normalizedHops;
    if (formData.has("dry_hops_json")) typeUpdates.dry_hops = normalizedDryHops;

    let boilVolume = volume_l;
    if (batch.type === "Beer") {
      const beerSubtype = formData.get("beer_subtype");
      const beerStyle = formData.get("beer_style");
      if (
        beerSubtype !== "all_grain" &&
        beerSubtype !== "fresh_wort_kit" &&
        beerSubtype !== "malt_extract_kit"
      ) {
        throw new Error("Choose a valid brewing method.");
      }
      if (!isBeerStyle(beerStyle)) {
        throw new Error("Choose a valid beer style.");
      }
      typeUpdates.beer_subtype = beerSubtype;
      typeUpdates.beer_style = beerStyle;
      typeUpdates.kit_url =
        beerSubtype !== "all_grain" && typeof formData.get("kit_url") === "string"
          ? (formData.get("kit_url") as string).trim() || null
          : null;

      if (beerSubtype === "all_grain") {
        boilVolume = Number(formData.get("boil_volume_l"));
        if (!Number.isFinite(boilVolume) || boilVolume <= 0) {
          throw new Error("Enter a valid boil volume.");
        }
        typeUpdates.boil_volume_l = boilVolume;
        typeUpdates.boil_time = Number(formData.get("boil_time")) || null;
        typeUpdates.malts = normalizedMalts;
        typeUpdates.hops = normalizedHops;
      } else {
        typeUpdates.boil_volume_l = null;
        typeUpdates.boil_time = null;
        typeUpdates.malts = [];
        typeUpdates.hops = [];
      }
      typeUpdates.yeast = formData.get("yeast") as string;
    } else {
      typeUpdates.boil_time = Number(formData.get("boil_time")) || null;
      typeUpdates.honey_type = formData.get("honey_type") as string;
      typeUpdates.honey_amount = Number(formData.get("honey_amount")) || null;
      typeUpdates.yeast = formData.get("yeast") as string;
    }

    let ibu: number;
    let ebc: number;
    if (batch.type === "Beer" && formData.get("beer_subtype") === "fresh_wort_kit") {
      const ibuRaw = formData.get("ibu");
      const ebcRaw = formData.get("ebc");
      ibu = typeof ibuRaw === "string" && ibuRaw.trim() ? Number(ibuRaw) : NaN;
      ebc = typeof ebcRaw === "string" && ebcRaw.trim() ? Number(ebcRaw) : NaN;
      if (
        !Number.isFinite(ibu) ||
        ibu < 0 ||
        !Number.isFinite(ebc) ||
        ebc < 0
      ) {
        throw new Error("Enter the IBU and EBC values shown on the fresh wort kit.");
      }
    } else {
      ibu = calcIBU(normalizedHops, og, volume_l, boilVolume) +
        calcDryHopIBU(normalizedDryHops, volume_l);
      ebc = calcEBC(normalizedMalts, volume_l).ebc;
    }
    typeUpdates.ibu = ibu;
    typeUpdates.ebc = ebc;

  } else if (batch.type === "Mead") {
    const fruits = parseJsonArray(formData, "fruits_json", parseIngredientRow);
    const baseLiquid = formData.get("base_liquid");
    const baseLiquidAmountRaw = formData.get("base_liquid_amount");
    typeUpdates.base_liquid =
      typeof baseLiquid === "string" && baseLiquid.trim()
        ? baseLiquid.trim()
        : "Water";
    typeUpdates.base_liquid_amount =
      typeof baseLiquidAmountRaw === "string" &&
      baseLiquidAmountRaw.trim() &&
      Number(baseLiquidAmountRaw) > 0
        ? Number(baseLiquidAmountRaw)
        : null;
    typeUpdates.honey_type = formData.get("honey_type") as string;
    typeUpdates.honey_amount = Number(formData.get("honey_amount")) || null;
    typeUpdates.fruits = fruits;
    typeUpdates.yeast = formData.get("yeast") as string;
  } else if (batch.type === "Wine" || batch.type === "Cider") {
    typeUpdates.juice_type = formData.get("juice_type") as string;
    typeUpdates.sugar_amount = Number(formData.get("sugar_amount")) || null;
    typeUpdates.yeast = formData.get("yeast") as string;
  } else if (batch.type === "Seltzer") {
    typeUpdates.sugar_amount = Number(formData.get("sugar_amount")) || null;
    typeUpdates.yeast = formData.get("yeast") as string;
  } else if (batch.type === "Other") {
    typeUpdates.ingredients = parseJsonArray(
      formData,
      "ingredients_json",
      parseIngredientRow
    );
    typeUpdates.steps = parseJsonStrings(formData, "steps_json");
  }

  const additives = formData.get("additives");
  const notes = formData.get("notes");
  const secondary_additions = formData.get("secondary_additions");
  const secondary_notes = formData.get("secondary_notes");

  const { data: firstReading, error: readingLookupError } = await serviceRole
    .from("sg_readings")
    .select("id, sg")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (readingLookupError) {
    throw new Error(`Could not load the first SG reading: ${readingLookupError.message}`);
  }

  let sgReadingChange: SGReadingChange | null = null;

  if (firstReading) {
    const { data: updatedReading, error: readingUpdateError } = await serviceRole
      .from("sg_readings")
      .update({ sg: og })
      .eq("id", firstReading.id)
      .eq("batch_id", batchId)
      .select("id")
      .maybeSingle();
    if (readingUpdateError) {
      throw new Error(`Could not update the first SG reading: ${readingUpdateError.message}`);
    }
    if (!updatedReading) {
      throw new Error("Could not update the first SG reading because access was denied");
    }
    sgReadingChange = {
      type: "updated",
      id: firstReading.id,
      previousSg: Number(firstReading.sg),
    };
  } else {
    const { data: insertedReading, error: readingInsertError } = await serviceRole
      .from("sg_readings")
      .insert({ batch_id: batchId, sg: og, created_at: startdato })
      .select("id")
      .single();
    if (readingInsertError) {
      throw new Error(`Could not add the initial SG reading: ${readingInsertError.message}`);
    }
    sgReadingChange = { type: "inserted", id: insertedReading.id };
  }

  const { data, error } = await supabase
    .from("batches")
    .update({
      name: name.trim(),
      volume_l,
      og,
      startdato,
      ...(formData.has("additives") ? { additives } : {}),
      ...(formData.has("notes") ? { notes } : {}),
      ...(formData.has("full_process")
        ? { full_process: formData.get("full_process") as string }
        : {}),
      ...(formData.has("secondary_additions") ? { secondary_additions } : {}),
      ...(formData.has("secondary_notes") ? { secondary_notes } : {}),
      ...(batch.fg != null && Number.isFinite(Number(batch.fg))
        ? { abv: (og - Number(batch.fg)) * 131.25 }
        : {}),
      ...typeUpdates,
    })
    .eq("id", batchId)
    .eq("aktivt_kar", karId)
    .select("id")
    .maybeSingle();

  if (error) {
    await rollbackSGReadingChange(serviceRole, batchId, sgReadingChange);
    throw new Error(`Could not update batch: ${error.message}`);
  }
  if (!data) {
    await rollbackSGReadingChange(serviceRole, batchId, sgReadingChange);
    throw new Error("Could not update batch because access was denied");
  }

  revalidatePath(`/kar/${karId}`);
}
