const HONEY_POINTS_PER_POUND_PER_GALLON = 35;
const SUGAR_POINTS_PER_POUND_PER_GALLON = 46;
const HONEY_DENSITY_POUNDS_PER_GALLON = 12;

export type GravityFermentable = "sugar" | "honey";

export function estimateOriginalGravity(
  fermentable: GravityFermentable,
  weightPounds: number,
  volumeGallons: number
) {
  if (
    !Number.isFinite(weightPounds) ||
    !Number.isFinite(volumeGallons) ||
    weightPounds <= 0 ||
    volumeGallons <= 0
  ) {
    return null;
  }

  const pointsPerPoundPerGallon =
    fermentable === "sugar"
      ? SUGAR_POINTS_PER_POUND_PER_GALLON
      : HONEY_POINTS_PER_POUND_PER_GALLON;
  const gravityPoints = (weightPounds * pointsPerPoundPerGallon) / volumeGallons;
  return 1 + gravityPoints / 1000;
}

export function estimateHoneyVolumeGallons(weightPounds: number) {
  if (!Number.isFinite(weightPounds) || weightPounds <= 0) return null;
  return weightPounds / HONEY_DENSITY_POUNDS_PER_GALLON;
}
