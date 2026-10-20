import { convertIngredientAmount } from "@/lib/inventory/convertIngredientAmount";
import {
  isBatchAdditiveInventoryCategory,
  isFruitInventoryCategory,
} from "@/lib/inventory/categories";
import { parseSecondaryAdditions } from "@/lib/recipes/secondaryAdditions";
import { getOtherRecipeIngredients } from "@/lib/recipes/otherRecipe";

export type InventoryItem = {
  id: string;
  name: string;
  amount: number;
  unit: string;
  minimum_amount: number;
  category: string;
  subcategory: string | null;
  alpha_acid?: number | null;
  ebc?: number | null;
  hop_year?: number | null;
};

export type RecipeInventoryRequirement = {
  name: string;
  amount: number | null;
  unit: string;
  selectionKey: string;
  category?: string;
  subcategory?: string;
  inventoryFilters?: { category: string; subcategory?: string }[];
  requireAmount?: boolean;
};

export type ScaledRecipeInventoryRequirement = {
  name: string;
  amount: number | null;
  unit: string;
  inventoryAmount: number | null;
  inventoryUnit: string | null;
  shortage: number | null;
  category?: string;
  subcategory?: string;
  inventoryFilters?: { category: string; subcategory?: string }[];
  status:
    | "available"
    | "shortage"
    | "untracked"
    | "ambiguous"
    | "incompatible"
    | "amount-needed"
    | "manual-review";
};

export function matchesRequirementInventoryCategory(
  item: InventoryItem,
  requirement: Pick<
    RecipeInventoryRequirement,
    "category" | "subcategory" | "inventoryFilters"
  >
) {
  if (requirement.inventoryFilters) {
    return requirement.inventoryFilters.some(
      (filter) =>
        item.category === filter.category &&
        (!filter.subcategory ||
          item.subcategory?.toLocaleLowerCase() === filter.subcategory.toLocaleLowerCase())
    );
  }
  if (requirement.category === "fruit") {
    return isFruitInventoryCategory(item.category, item.subcategory);
  }
  if (requirement.category === "additives") {
    return isBatchAdditiveInventoryCategory(item.category, item.subcategory);
  }
  return (
    (!requirement.category || item.category === requirement.category) &&
    (!requirement.subcategory ||
      item.subcategory?.toLocaleLowerCase() === requirement.subcategory.toLocaleLowerCase())
  );
}

function parseIngredientRows(
  formData: FormData,
  fieldName: string
): Record<string, unknown>[] | null {
  const raw = formData.get(fieldName);
  if (typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is Record<string, unknown> =>
            typeof entry === "object" && entry !== null && !Array.isArray(entry)
        )
      : null;
  } catch {
    return null;
  }
}

function formNumber(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const parsed = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function recipeInventoryRequirements(
  formData: FormData
): RecipeInventoryRequirement[] | null {
  const requirements: RecipeInventoryRequirement[] = [];
  const addRows = (
    fieldName: string,
    keyPrefix: string,
    category?: string,
    subcategory?: string,
    defaultUnit = "kg"
  ) => {
    const rows = parseIngredientRows(formData, fieldName);
    if (rows === null) return false;
    rows.forEach((row, index) => {
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const amount = formNumber(row.amount);
      if (!name || /\bwater\b/i.test(name) || amount === null || amount <= 0) return;
      requirements.push({
        name,
        amount,
        unit: typeof row.unit === "string" && row.unit.trim() ? row.unit : defaultUnit,
        selectionKey: `${keyPrefix}:${index}`,
        category,
        subcategory,
      });
    });
    return true;
  };
  const addMeasuredTextRows = (
    raw: unknown,
    selectionPrefix: string,
    category: string,
    subcategory?: string
  ) => {
    if (typeof raw !== "string") return;
    raw.split(/\r?\n/).forEach((line, index) => {
      const match = line.trim().match(/^(.+?):\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*(.*?)$/);
      if (!match) return;
      const name = match[1].trim();
      const amount = formNumber(match[2]);
      if (!name || /\bwater\b/i.test(name) || amount === null || amount <= 0) return;
      requirements.push({
        name,
        amount,
        unit: match[3].trim(),
        selectionKey: `${selectionPrefix}:${index}`,
        category,
        subcategory,
      });
    });
  };

  const type = formData.get("type");
  if (
    (type === "Beer" || type === "Braggot") &&
    (!addRows("malts_json", "malt", "malts") ||
      !addRows("hops_json", "hop", "hops", undefined, "g"))
  ) {
    return null;
  }
  if (type === "Beer" || type === "Braggot") {
    const dryHops = parseIngredientRows(formData, "dry_hops_json");
    if (dryHops === null) return null;
    dryHops.forEach((hop, index) => {
      const name = typeof hop.name === "string" ? hop.name.trim() : "";
      const amount = formNumber(hop.amount);
      if (!name || /\bwater\b/i.test(name) || amount === null || amount <= 0) return;
      requirements.push({
        name,
        amount,
        unit: "g",
        selectionKey: `dryhop:${index}`,
        category: "hops",
      });
    });
  }
  if (type === "Mead" && !addRows("fruits_json", "fruit", "fruit")) {
    return null;
  }
  if (type === "Other" && !addRows("ingredients_json", "ingredient")) {
    return null;
  }

  addMeasuredTextRows(formData.get("additives"), "additive", "additives");
  const secondaryAdditions = parseSecondaryAdditions(
    formData.get("secondary_additions")
  );
  for (const [index, fruit] of secondaryAdditions.fruits.entries()) {
    const name = fruit.name.trim();
    const amount = formNumber(fruit.amount);
    if (!name || /\bwater\b/i.test(name) || amount === null || amount <= 0) continue;
    requirements.push({
      name,
      amount,
      unit: fruit.unit.trim(),
      selectionKey: `secondary-fruit:${index}`,
      category: "fruit",
    });
  }
  for (const [index, additive] of secondaryAdditions.additives.entries()) {
    const name = additive.name.trim();
    const amount = formNumber(additive.amount);
    if (!name || /\bwater\b/i.test(name) || amount === null || amount <= 0) continue;
    requirements.push({
      name,
      amount,
      unit: additive.unit.trim(),
      selectionKey: `secondary-additive:${index}`,
      category: "additives",
    });
  }
  addMeasuredTextRows(
    secondaryAdditions.legacyText,
    "secondary-additive-legacy",
    "additives"
  );

  const addNamedAmount = (
    nameField: string,
    amountField: string,
    selectionKey: string,
    category: string,
    subcategory: string,
    unit: string,
    requireAmount = false
  ) => {
    const name = formData.get(nameField);
    if (typeof name !== "string" || !name.trim() || /\bwater\b/i.test(name)) return;
    const amount = formNumber(formData.get(amountField));
    if ((amount === null || amount <= 0) && !requireAmount) return;
    requirements.push({
      name: name.trim(),
      amount: amount !== null && amount > 0 ? amount : null,
      unit,
      selectionKey,
      category,
      subcategory,
      requireAmount,
    });
  };

  if (type === "Mead" || type === "Braggot") {
    addNamedAmount(
      "honey_type",
      "inventory_honey_amount",
      "honey",
      "fermentables",
      "Honey",
      "",
      true
    );
  }
  if (type === "Cider") {
    addNamedAmount(
      "juice_type",
      "inventory_juice_amount",
      "juice",
      "fermentables",
      "Juice",
      "",
      true
    );
  } else if (type === "Wine") {
    const name = formData.get("juice_type");
    const amount = formNumber(formData.get("inventory_juice_amount"));
    if (typeof name === "string" && name.trim()) {
      requirements.push({
        name: name.trim(),
        amount: amount !== null && amount > 0 ? amount : null,
        unit: "",
        selectionKey: "juice",
        inventoryFilters: [
          { category: "fermentables", subcategory: "Juice" },
          { category: "fruit", subcategory: "Grapes" },
          { category: "flavorings", subcategory: "Fruit" },
          { category: "flavorings", subcategory: "Fruit / Grapes" },
        ],
        requireAmount: true,
      });
    }
  }
  const sugarAmount = formNumber(formData.get("sugar_amount"));
  if (sugarAmount !== null && sugarAmount > 0) {
    requirements.push({
      name: "sugar",
      amount: sugarAmount,
      unit: "kg",
      selectionKey: "sugar",
      category: "fermentables",
      subcategory: "Sugar",
    });
  }

  const yeast = formData.get("yeast");
  if (typeof yeast === "string" && yeast.trim()) {
    requirements.push({
      name: yeast.trim(),
      amount: null,
      unit: "",
      selectionKey: "yeast",
      category: "yeast",
    });
  }

  return requirements;
}

export function recipeRequirementsFromSavedRecipe(
  recipe: Record<string, unknown>
): RecipeInventoryRequirement[] | null {
  const formData = new FormData();
  const appendJson = (fieldName: string, value: unknown) => {
    formData.set(fieldName, JSON.stringify(Array.isArray(value) ? value : []));
  };
  formData.set("type", typeof recipe.type === "string" ? recipe.type : "");
  formData.set("additives", typeof recipe.additives === "string" ? recipe.additives : "");
  formData.set(
    "secondary_additions",
    typeof recipe.secondary_additions === "string" ? recipe.secondary_additions : ""
  );
  appendJson("malts_json", recipe.malts);
  appendJson("hops_json", recipe.hops);
  appendJson("dry_hops_json", recipe.dry_hops);
  appendJson("fruits_json", recipe.fruits);
  appendJson("ingredients_json", getOtherRecipeIngredients(recipe.ingredients));

  for (const field of ["honey_type", "juice_type", "yeast"]) {
    formData.set(field, typeof recipe[field] === "string" ? recipe[field] : "");
  }
  formData.set(
    "inventory_honey_amount",
    recipe.honey_amount == null ? "" : String(recipe.honey_amount)
  );
  formData.set(
    "sugar_amount",
    recipe.sugar_amount == null ? "" : String(recipe.sugar_amount)
  );

  return recipeInventoryRequirements(formData);
}

export function getSavedRecipeShoppingRequirements(
  recipe: Record<string, unknown>,
  items: InventoryItem[]
): { name: string; amount: number | null; unit: string }[] {
  const requirements = recipeRequirementsFromSavedRecipe(recipe);
  if (!requirements) {
    throw new Error("Could not read recipe ingredients for the shopping list.");
  }

  const normalize = (value: string) =>
    value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const combinedRequirements: typeof requirements = [];
  for (const requirement of requirements) {
    const matchingRequirement = combinedRequirements.find((existing) => {
      if (normalize(existing.name) !== normalize(requirement.name)) return false;
      if (existing.amount === null || requirement.amount === null) {
        return existing.amount === requirement.amount &&
          convertIngredientAmount(0, requirement.unit, existing.unit) !== null;
      }
      return convertIngredientAmount(0, requirement.unit, existing.unit) !== null;
    });
    if (!matchingRequirement) {
      combinedRequirements.push({ ...requirement });
      continue;
    }
    if (matchingRequirement.amount !== null && requirement.amount !== null) {
      const convertedAmount = convertIngredientAmount(
        requirement.amount,
        requirement.unit,
        matchingRequirement.unit
      );
      if (convertedAmount === null) {
        combinedRequirements.push({ ...requirement });
        continue;
      }
      matchingRequirement.amount += convertedAmount;
    }
  }

  return combinedRequirements.map((requirement) => {
    if (requirement.amount === null) {
      return { name: requirement.name, amount: null, unit: requirement.unit };
    }

    const candidates = items.filter(
      (item) =>
        normalize(item.name) === normalize(requirement.name) &&
        matchesRequirementInventoryCategory(item, requirement)
    );
    if (candidates.length !== 1) {
      return {
        name: requirement.name,
        amount: requirement.amount,
        unit: requirement.unit,
      };
    }

    const item = candidates[0];
    const requiredInInventoryUnit = requirement.unit
      ? convertIngredientAmount(requirement.amount, requirement.unit, item.unit)
      : requirement.amount;
    if (requiredInInventoryUnit === null) {
      return {
        name: requirement.name,
        amount: requirement.amount,
        unit: requirement.unit,
      };
    }

    const missing = Math.max(0, requiredInInventoryUnit - item.amount);
    return {
      name: requirement.name,
      amount: missing,
      unit: item.unit,
    };
  });
}

export function getScaledRecipeInventoryRequirements(
  recipe: Record<string, unknown>,
  items: InventoryItem[],
  targetVolume: number
): ScaledRecipeInventoryRequirement[] {
  const baseVolume = Number(recipe.volume);
  if (
    !Number.isFinite(baseVolume) ||
    baseVolume <= 0 ||
    !Number.isFinite(targetVolume) ||
    targetVolume <= 0
  ) {
    throw new Error("Recipe and target volumes must be greater than zero.");
  }

  const requirements = recipeRequirementsFromSavedRecipe(recipe);
  if (!requirements) {
    throw new Error("Could not read recipe ingredients.");
  }

  const factor = targetVolume / baseVolume;
  const scaledRequirements = requirements.map((requirement) => ({
    ...requirement,
    amount:
      requirement.amount === null
        ? null
        : isLinearlyScalableRequirement(requirement)
          ? requirement.amount * factor
          : requirement.amount,
  }));
  const normalize = (value: string) =>
    value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const aggregated: RecipeInventoryRequirement[] = [];

  for (const requirement of scaledRequirements) {
    const existing = aggregated.find(
      (candidate) =>
        normalize(candidate.name) === normalize(requirement.name) &&
        candidate.category === requirement.category &&
        candidate.subcategory === requirement.subcategory &&
        convertIngredientAmount(0, requirement.unit, candidate.unit) !== null &&
        (candidate.amount === null) === (requirement.amount === null)
    );
    if (!existing) {
      aggregated.push({ ...requirement });
      continue;
    }
    if (existing.amount !== null && requirement.amount !== null) {
      const converted = convertIngredientAmount(
        requirement.amount,
        requirement.unit,
        existing.unit
      );
      if (converted !== null) existing.amount += converted;
    }
  }

  const remainingInventory = new Map<string, number>();
  return aggregated.map((requirement) => {
    if (requirement.amount === null) {
      return {
        name: requirement.name,
        amount: null,
        unit: requirement.unit,
        inventoryAmount: null,
        inventoryUnit: null,
        shortage: null,
        category: requirement.category,
        subcategory: requirement.subcategory,
        inventoryFilters: requirement.inventoryFilters,
        status: "amount-needed",
      };
    }

    const exactMatches = items.filter(
      (item) =>
        normalize(item.name) === normalize(requirement.name) &&
        matchesRequirementInventoryCategory(item, requirement)
    );
    if (!isLinearlyScalableRequirement(requirement)) {
      return {
        name: requirement.name,
        amount: requirement.amount,
        unit: requirement.unit,
        inventoryAmount:
          exactMatches.length === 1 ? exactMatches[0].amount : null,
        inventoryUnit:
          exactMatches.length === 1 ? exactMatches[0].unit : null,
        shortage: null,
        category: requirement.category,
        subcategory: requirement.subcategory,
        inventoryFilters: requirement.inventoryFilters,
        status: "manual-review",
      };
    }

    if (exactMatches.length > 1) {
      return {
        name: requirement.name,
        amount: requirement.amount,
        unit: requirement.unit,
        inventoryAmount: null,
        inventoryUnit: null,
        shortage: null,
        category: requirement.category,
        subcategory: requirement.subcategory,
        inventoryFilters: requirement.inventoryFilters,
        status: "ambiguous",
      };
    }

    const item = exactMatches[0];
    if (!item) {
      return {
        name: requirement.name,
        amount: requirement.amount,
        unit: requirement.unit,
        inventoryAmount: null,
        inventoryUnit: null,
        shortage: requirement.amount,
        category: requirement.category,
        subcategory: requirement.subcategory,
        inventoryFilters: requirement.inventoryFilters,
        status: "untracked",
      };
    }

    const requiredInInventoryUnit = requirement.unit
      ? convertIngredientAmount(requirement.amount, requirement.unit, item.unit)
      : requirement.amount;
    if (requiredInInventoryUnit === null) {
      return {
        name: requirement.name,
        amount: requirement.amount,
        unit: requirement.unit,
        inventoryAmount: item.amount,
        inventoryUnit: item.unit,
        shortage: null,
        category: requirement.category,
        subcategory: requirement.subcategory,
        inventoryFilters: requirement.inventoryFilters,
        status: "incompatible",
      };
    }

    const available = remainingInventory.get(item.id) ?? item.amount;
    const shortage = Math.max(0, requiredInInventoryUnit - available);
    remainingInventory.set(
      item.id,
      Math.max(0, available - requiredInInventoryUnit)
    );
    return {
      name: requirement.name,
      amount: requirement.amount,
      unit: requirement.unit,
      inventoryAmount: available,
      inventoryUnit: item.unit,
      shortage,
      category: requirement.category,
      subcategory: requirement.subcategory,
      inventoryFilters: requirement.inventoryFilters,
      status: shortage > 0 ? "shortage" : "available",
    };
  });
}

function isLinearlyScalableRequirement(
  requirement: RecipeInventoryRequirement
): boolean {
  if (requirement.inventoryFilters) return true;
  return ["fermentables", "fruit", "malts", "hops"].includes(
    requirement.category ?? ""
  );
}

export function getInventoryRequirementIssues(
  requirements: RecipeInventoryRequirement[],
  items: InventoryItem[],
  selections: Record<string, string>,
  validateRequiredAmounts: boolean,
  allowAmbiguousSelection = false
): string[] {
  const issues: string[] = [];
  const usageByItem = new Map<string, { item: InventoryItem; amount: number; names: string[] }>();
  const normalize = (value: string) =>
    value.trim().toLocaleLowerCase().replace(/\s+/g, " ");

  for (const requirement of requirements) {
    if (validateRequiredAmounts && requirement.requireAmount && requirement.amount === null) {
      issues.push(`Enter the amount of ${requirement.name} to use.`);
      continue;
    }

    const isAllowed = (item: InventoryItem) =>
      matchesRequirementInventoryCategory(item, requirement);
    const selectedId = selections[requirement.selectionKey];
    let candidates = selectedId
      ? items.filter((item) => item.id === selectedId && isAllowed(item))
      : items.filter(
          (item) => normalize(item.name) === normalize(requirement.name) && isAllowed(item)
        );

    if (!selectedId && candidates.length === 0 && requirement.subcategory) {
      const generic = ["honey", "sugar"].includes(normalize(requirement.name));
      candidates = items.filter((item) => {
        if (!isAllowed(item)) return false;
        const itemName = normalize(item.name);
        const ingredientName = normalize(requirement.name);
        return generic
          ? item.subcategory?.toLocaleLowerCase() === requirement.subcategory?.toLocaleLowerCase() ||
              itemName.includes(ingredientName)
          : itemName.includes(ingredientName) || ingredientName.includes(itemName);
      });
    }

    if (candidates.length !== 1) {
      if (allowAmbiguousSelection && candidates.length > 1) continue;
      issues.push(
        candidates.length === 0
          ? `${requirement.name} is not in your inventory.`
          : `Choose which inventory item to use for ${requirement.name}.`
      );
      continue;
    }

    const item = candidates[0];
    if (requirement.amount === null) continue;
    const convertedAmount = requirement.unit
      ? convertIngredientAmount(requirement.amount, requirement.unit, item.unit)
      : requirement.amount;
    if (convertedAmount === null) {
      issues.push(`${requirement.name} cannot be converted to your inventory unit (${item.unit}).`);
      continue;
    }

    const usage = usageByItem.get(item.id);
    if (usage) {
      usage.amount += convertedAmount;
      usage.names.push(requirement.name);
    } else {
      usageByItem.set(item.id, {
        item,
        amount: convertedAmount,
        names: [requirement.name],
      });
    }
  }

  for (const { item, amount, names } of usageByItem.values()) {
    if (amount > item.amount) {
      issues.push(
        `${names.join(", ")} needs ${amount} ${item.unit}, but only ${item.amount} ${item.unit} is available.`
      );
    }
  }
  return issues;
}

export function getSavedRecipeInventoryIssues(
  recipe: Record<string, unknown>,
  items: InventoryItem[],
  validateRequiredAmounts = false,
  allowAmbiguousSelection = false
): string[] {
  const requirements = recipeRequirementsFromSavedRecipe(recipe);
  return requirements
    ? getInventoryRequirementIssues(
        requirements,
        items,
        {},
        validateRequiredAmounts,
        allowAmbiguousSelection
      )
    : ["Could not check this recipe's ingredients against inventory."];
}
