export const BREWERY_PRODUCT_CATEGORIES = [
  ["all-grain-kit", "All-grain kit"],
  ["fresh-wort-kit", "Fresh wort kit"],
  ["malt-extract-kit", "Malt extract kit"],
  ["beer", "Beer"],
  ["cider", "Cider"],
  ["mead", "Mead"],
  ["wine", "Wine"],
  ["spirits", "Spirits"],
  ["non-alcoholic", "Non-alcoholic"],
  ["brewing-equipment", "Brewing equipment"],
  ["brewing-ingredients", "Brewing ingredients"],
  ["merchandise", "Merchandise"],
  ["other", "Other"],
] as const;

export function breweryProductCategoryLabel(category: string) {
  return BREWERY_PRODUCT_CATEGORIES.find(([value]) => value === category)?.[1];
}
