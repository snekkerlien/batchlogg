export type OtherRecipeIngredient = {
  name: string;
  amount: number | string;
  unit: string;
};

export function getOtherRecipeStyle(ingredients: unknown): string {
  if (!ingredients || Array.isArray(ingredients) || typeof ingredients !== "object") {
    return "";
  }

  const style = (ingredients as { other_style?: unknown }).other_style;
  return typeof style === "string" ? style.trim() : "";
}

export function getOtherRecipeIngredients(ingredients: unknown): OtherRecipeIngredient[] {
  if (Array.isArray(ingredients)) return ingredients as OtherRecipeIngredient[];
  if (!ingredients || typeof ingredients !== "object") return [];

  const items = (ingredients as { items?: unknown }).items;
  return Array.isArray(items) ? items as OtherRecipeIngredient[] : [];
}

export function withOtherRecipeStyle(style: unknown, items: unknown) {
  return {
    other_style: typeof style === "string" ? style.trim() : "",
    items: Array.isArray(items) ? items : [],
  };
}
