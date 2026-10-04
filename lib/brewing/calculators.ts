function isValidAbv(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
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
