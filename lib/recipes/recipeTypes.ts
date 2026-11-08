export const RECIPE_TYPES: readonly string[] = [
  "Mead", "Beer", "Cider", "Wine", "Seltzer", "Braggot", "Other",
];

export function isKnownRecipeType(type: string): boolean {
  return RECIPE_TYPES.includes(type);
}
