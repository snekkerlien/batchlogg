export const BUSINESS_TYPES = [
  { value: "brewery", label: "Brewery" },
  { value: "pub", label: "Pub or bar" },
  { value: "homebrew_shop", label: "Homebrew shop" },
  { value: "other", label: "Other" },
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

export function isBusinessType(value: unknown): value is BusinessType {
  return BUSINESS_TYPES.some((type) => type.value === value);
}

export function businessTypeLabel(value: string, otherLabel?: string | null) {
  if (value === "other" && otherLabel) return otherLabel;
  return BUSINESS_TYPES.find((type) => type.value === value)?.label ?? "Other";
}
