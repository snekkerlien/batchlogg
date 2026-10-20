function isValidAbv(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

export type GravityScale = "sg" | "oechsle" | "plato" | "brix" | "balling";

export function convertGravityToSpecificGravity(
  value: number,
  scale: GravityScale
): number | null {
  if (!Number.isFinite(value)) return null;

  if (scale === "sg") {
    return value >= 0.8 && value <= 2 ? value : null;
  }
  if (scale === "oechsle") {
    return value >= 0 && value <= 1000 ? 1 + value / 1000 : null;
  }
  if (value < 0 || value > 100) return null;

  return 1 + value / (258.6 - ((value / 258.2) * 227.1));
}

export function calculateWortCorrectionFactor(
  refractometerBrix: number,
  hydrometerSpecificGravity: number
): number | null {
  if (
    !Number.isFinite(refractometerBrix) ||
    refractometerBrix <= 0 ||
    refractometerBrix > 35 ||
    !Number.isFinite(hydrometerSpecificGravity) ||
    hydrometerSpecificGravity < 0.8 ||
    hydrometerSpecificGravity > 1.2
  ) {
    return null;
  }

  const plato =
    -616.868 +
    1111.14 * hydrometerSpecificGravity -
    630.272 * hydrometerSpecificGravity ** 2 +
    135.997 * hydrometerSpecificGravity ** 3;
  const factor = refractometerBrix / plato;
  return Number.isFinite(factor) && factor >= 0.9 && factor <= 1.1
    ? factor
    : null;
}

export type RefractometerCorrection = {
  originalGravity: number;
  finalGravity: number;
  abv: number;
};

export function calculateRefractometerCorrection(
  originalBrix: number,
  finalBrix: number,
  wortCorrectionFactor: number
): RefractometerCorrection | null {
  if (
    !Number.isFinite(originalBrix) ||
    !Number.isFinite(finalBrix) ||
    !Number.isFinite(wortCorrectionFactor) ||
    originalBrix < 0 ||
    originalBrix > 35 ||
    finalBrix < 0 ||
    finalBrix > 35 ||
    wortCorrectionFactor < 0.9 ||
    wortCorrectionFactor > 1.1
  ) {
    return null;
  }

  const correctedOriginalBrix = originalBrix / wortCorrectionFactor;
  const correctedFinalBrix = finalBrix / wortCorrectionFactor;
  const originalGravity = convertGravityToSpecificGravity(
    correctedOriginalBrix,
    "brix"
  );
  const finalGravity =
    1 -
    0.0044993 * correctedOriginalBrix +
    0.011774 * correctedFinalBrix +
    0.00027581 * correctedOriginalBrix ** 2 -
    0.0012717 * correctedFinalBrix ** 2 -
    0.00000728 * correctedOriginalBrix ** 3 +
    0.000063293 * correctedFinalBrix ** 3;

  if (
    originalGravity === null ||
    finalGravity < 0.8 ||
    finalGravity > originalGravity
  ) {
    return null;
  }
  const abv = calculateAbvFromGravity(originalGravity, finalGravity);
  if (abv === null) return null;

  return { originalGravity, finalGravity, abv };
}

export function calculateAbvFromGravity(originalGravity: number, finalGravity: number) {
  if (
    !Number.isFinite(originalGravity) ||
    !Number.isFinite(finalGravity) ||
    originalGravity <= 0 ||
    finalGravity < 0 ||
    originalGravity < finalGravity
  ) {
    return null;
  }
  const result = (originalGravity - finalGravity) * 131.25;
  return result <= 100 ? result : null;
}

export function calculateDilutedAbv(
  currentAbv: number,
  currentVolume: number,
  addedVolume: number
) {
  if (
    !isValidAbv(currentAbv) ||
    !Number.isFinite(currentVolume) ||
    !Number.isFinite(addedVolume) ||
    currentVolume <= 0 ||
    addedVolume < 0
  ) {
    return null;
  }
  return (currentAbv * currentVolume) / (currentVolume + addedVolume);
}

export function calculateVolumeForTargetAbv(
  currentAbv: number,
  currentVolume: number,
  additionAbv: number,
  targetAbv: number
) {
  if (
    !isValidAbv(currentAbv) ||
    !isValidAbv(additionAbv) ||
    !isValidAbv(targetAbv) ||
    !Number.isFinite(currentVolume) ||
    currentVolume <= 0
  ) {
    return null;
  }
  if (targetAbv === currentAbv) return 0;
  const minAvailableAbv = Math.min(currentAbv, additionAbv);
  const maxAvailableAbv = Math.max(currentAbv, additionAbv);
  if (
    targetAbv < minAvailableAbv ||
    targetAbv > maxAvailableAbv ||
    targetAbv === additionAbv
  ) {
    return null;
  }
  const requiredVolume =
    (currentVolume * (targetAbv - currentAbv)) / (additionAbv - targetAbv);
  return Number.isFinite(requiredVolume) && requiredVolume >= 0
    ? requiredVolume
    : null;
}

export function calculateDilutedGravity(
  originalGravity: number,
  currentVolume: number,
  addedWaterVolume: number
) {
  if (
    !Number.isFinite(originalGravity) ||
    originalGravity <= 0 ||
    !Number.isFinite(currentVolume) ||
    currentVolume <= 0 ||
    !Number.isFinite(addedWaterVolume) ||
    addedWaterVolume < 0
  ) {
    return null;
  }
  return 1 + ((originalGravity - 1) * currentVolume) / (currentVolume + addedWaterVolume);
}

export function calculateFermentableForAbv(
  volumeLiters: number,
  targetAbv: number,
  fermentable: "sugar" | "honey"
) {
  if (
    !Number.isFinite(volumeLiters) ||
    volumeLiters <= 0 ||
    !isValidAbv(targetAbv)
  ) {
    return null;
  }
  // Batch volume is the final volume, so honey displacement is already included.
  const gravityPoints = (targetAbv / 131.25) * 1000;
  const pointsPerPoundPerGallon = fermentable === "sugar" ? 46 : 35;
  const gallons = volumeLiters / 3.785411784;
  const pounds = (gravityPoints * gallons) / pointsPerPoundPerGallon;
  return pounds * 453.59237;
}

// Original gravity needed to reach the target ABV, assuming fermentation finishes at 1.000.
export function calculateOgForAbv(targetAbv: number) {
  if (!isValidAbv(targetAbv)) return null;
  return 1 + targetAbv / 131.25;
}
