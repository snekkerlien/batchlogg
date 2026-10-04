export type UnitSystem = "metric" | "imperial";
export type UnitKind = "volume" | "kg" | "g";

const LITERS_PER_GALLON = 3.785411784;
const KG_PER_POUND = 0.45359237;
const GRAMS_PER_OUNCE = 28.349523125;

const FACTORS: Record<UnitKind, number> = {
  volume: LITERS_PER_GALLON,
  kg: KG_PER_POUND,
  g: GRAMS_PER_OUNCE,
};

const LABELS: Record<UnitKind, Record<UnitSystem, string>> = {
  volume: { metric: "L", imperial: "gal" },
  kg: { metric: "kg", imperial: "lb" },
  g: { metric: "g", imperial: "oz" },
};

export const UNIT_STORAGE_KEY = "batchlog-unit-system";

export function isUnitSystem(value: unknown): value is UnitSystem {
  return value === "metric" || value === "imperial";
}

export function unitLabel(kind: UnitKind, system: UnitSystem) {
  return LABELS[kind][system];
}

// All stored values are metric (L, kg, g).
export function toDisplay(kind: UnitKind, metricValue: number, system: UnitSystem) {
  return system === "imperial" ? metricValue / FACTORS[kind] : metricValue;
}

export function fromDisplay(kind: UnitKind, displayValue: number, system: UnitSystem) {
  return system === "imperial" ? displayValue * FACTORS[kind] : displayValue;
}

export function roundForDisplay(value: number, maxDecimals = 2) {
  const factor = 10 ** maxDecimals;
  return Math.round(value * factor) / factor;
}

export function formatQuantity(
  kind: UnitKind,
  metricValue: number | string | null | undefined,
  system: UnitSystem,
  maxDecimals = 2
) {
  if (metricValue === null || metricValue === undefined || metricValue === "") return null;
  const numeric = Number(metricValue);
  if (!Number.isFinite(numeric)) return null;
  const shown = roundForDisplay(toDisplay(kind, numeric, system), maxDecimals);
  return `${shown} ${unitLabel(kind, system)}`;
}
