type InventoryCategory = {
  id: string;
  label: string;
  subcategories: readonly string[];
};

export const INVENTORY_CATEGORIES = [
  {
    id: "fermentables",
    label: "Fermentables",
    subcategories: ["Sugar", "Honey", "Juice", "Extract"],
  },
  {
    id: "malts",
    label: "Malts",
    subcategories: ["Base Malt", "Specialty Malt"],
  },
  { id: "hops", label: "Hops", subcategories: [] },
  { id: "yeast", label: "Yeast", subcategories: [] },
  {
    id: "additives",
    label: "Additives",
    subcategories: ["Nutrients", "Clarifiers", "Acids"],
  },
  {
    id: "flavorings",
    label: "Flavorings",
    subcategories: ["Spices", "Herbs", "Wood"],
  },
  {
    id: "fruit",
    label: "Fruits",
    subcategories: ["Grapes", "Berries", "Other fruit"],
  },
  { id: "water", label: "Water", subcategories: ["Minerals", "Salts"] },
  {
    id: "chemicals",
    label: "Chemicals",
    subcategories: ["Acids", "Sanitizers", "Cleaning agents", "Sulfites"],
  },
  {
    id: "packaging",
    label: "Bottling",
    subcategories: ["Bottles", "Caps", "Corks", "Kegs"],
  },
  {
    id: "equipment",
    label: "Equipment",
    subcategories: ["Fermenters", "Tubing", "Miscellaneous", "Cleaning"],
  },
] as const satisfies readonly InventoryCategory[];

export function getInventorySubcategoryOptions(categoryId: string) {
  const category = INVENTORY_CATEGORIES.find((item) => item.id === categoryId);
  if (!category) return [];

  return category.subcategories.map((subcategory) => ({
    value: subcategory,
    label: subcategory,
  }));
}

export function isInventorySubcategory(categoryId: string, subcategory: string) {
  return getInventorySubcategoryOptions(categoryId).some(
    (option) => option.value === subcategory
  );
}

export function getInventoryItemCategory(category?: string | null, subcategory?: string | null) {
  if (category === "water-chemicals") {
    if (subcategory?.toLocaleLowerCase() === "water") {
      return { category: "water", subcategory: "" };
    }
    if (["minerals", "salts"].includes(subcategory?.toLocaleLowerCase() ?? "")) {
      return { category: "water", subcategory: subcategory ?? "" };
    }
    return {
      category: "chemicals",
      subcategory: subcategory?.toLocaleLowerCase() === "campden" ? "Sulfites" : subcategory ?? "",
    };
  }
  if (category === "additives" && subcategory?.toLocaleLowerCase() === "salts") {
    return { category: "water", subcategory: "Salts" };
  }
  if (category === "additives" && subcategory?.toLocaleLowerCase() === "sulfites") {
    return { category: "chemicals", subcategory: "Sulfites" };
  }
  if (category === "flavorings" && subcategory?.toLocaleLowerCase() === "fruit") {
    return { category: "fruit", subcategory: "Other fruit" };
  }
  if (category === "flavorings" && subcategory?.toLocaleLowerCase() === "fruit / grapes") {
    return { category: "fruit", subcategory: "Grapes" };
  }
  return { category: category ?? "", subcategory: subcategory ?? "" };
}

export function isFruitInventoryCategory(category?: string | null, subcategory?: string | null) {
  return getInventoryItemCategory(category, subcategory).category === "fruit";
}

export function isBatchAdditiveInventoryCategory(
  category?: string | null,
  subcategory?: string | null
) {
  const mapped = getInventoryItemCategory(category, subcategory);
  return (
    mapped.category === "additives" ||
    (mapped.category === "chemicals" && mapped.subcategory.toLocaleLowerCase() === "sulfites")
  );
}

export const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  honey: "fermentables",
  nutrients: "additives",
  bottling: "packaging",
  cleaning: "equipment",
  "water-chemicals": "chemicals",
};

export const SNUS_CATEGORIES = ["snus", "snusessens"] as const;
