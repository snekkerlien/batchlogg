import { convertIngredientAmount } from "@/lib/inventory/convertIngredientAmount";

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
  requireAmount?: boolean;
};

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
  if (type === "Mead" && !addRows("fruits_json", "fruit", "flavorings", "Fruit")) {
    return null;
  }
  if (type === "Other" && !addRows("ingredients_json", "ingredient")) {
    return null;
  }

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
  if (type === "Cider" || type === "Wine") {
    addNamedAmount(
      "juice_type",
      "inventory_juice_amount",
      "juice",
      "fermentables",
      "Juice",
      "",
      true
    );
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
  appendJson("malts_json", recipe.malts);
  appendJson("hops_json", recipe.hops);
  appendJson("dry_hops_json", recipe.dry_hops);
  appendJson("fruits_json", recipe.fruits);
  appendJson("ingredients_json", recipe.ingredients);

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
        (!requirement.category || item.category === requirement.category) &&
        (!requirement.subcategory ||
          item.subcategory?.toLocaleLowerCase() === requirement.subcategory.toLocaleLowerCase())
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
      (!requirement.category || item.category === requirement.category) &&
      (!requirement.subcategory ||
        item.subcategory?.toLocaleLowerCase() === requirement.subcategory.toLocaleLowerCase());
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
