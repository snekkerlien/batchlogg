export const INVENTORY_CATEGORIES = [
  {
    id: "fermentables",
    label: "Fermentables",
    subcategories: ["Base Malt", "Specialty Malt", "Sugar", "Honey", "Extract"],
  },
  { id: "hops", label: "Hops", subcategories: [] },
  { id: "yeast", label: "Yeast", subcategories: [] },
  {
    id: "additives",
    label: "Additives",
    subcategories: ["Nutrients", "Clarifiers", "Salts", "Acids"],
  },
  {
    id: "flavorings",
    label: "Flavorings",
    subcategories: ["Fruit", "Spices", "Herbs", "Wood"],
  },
  {
    id: "packaging",
    label: "Packaging",
    subcategories: ["Bottles", "Caps", "Corks", "Kegs"],
  },
  {
    id: "equipment",
    label: "Equipment",
    subcategories: ["Fermenters", "Tubing", "Miscellaneous", "Cleaning"],
  },
] as const;

export const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  honey: "fermentables",
  fruit: "flavorings",
  nutrients: "additives",
  bottling: "packaging",
  cleaning: "equipment",
};

export const SNUS_CATEGORIES = ["snus", "snusessens"] as const;
