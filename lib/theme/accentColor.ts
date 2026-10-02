export const DEFAULT_ACCENT_COLOR = "#22c55e";

export function isAccentColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
