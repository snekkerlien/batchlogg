type HopAddition = {
  amount?: number | string | null;
  alpha?: number | string | null;
  time?: number | string | null;
  addition_type?: "boil" | "whirlpool" | null;
  temperature?: number | string | null;
};

type DryHopAddition = {
  amount?: number | string | null;
  contact?: number | string | null;
  alpha?: number | string | null;
};

type MaltAddition = {
  name?: string | null;
  amount?: number | string | null;
  unit?: string | null;
  ebc?: number | string | null;
};

function numericValue(value: number | string | null | undefined): number | null {
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(number) ? number : null;
}

function maltWeightInKilograms(malt: MaltAddition): number | null {
  const amount = numericValue(malt.amount);
  if (amount === null || amount < 0) return null;

  const unit = (malt.unit ?? "kg").trim().toLowerCase().replace(/[.\s]/g, "");
  const kilogramsPerUnit: Record<string, number> = {
    kg: 1,
    g: 0.001,
    mg: 0.000001,
    lb: 0.45359237,
    lbs: 0.45359237,
    oz: 0.028349523125,
  };
  const factor = kilogramsPerUnit[unit];
  return factor === undefined ? null : amount * factor;
}

export function calcIBU(
  hops: HopAddition[],
  originalGravity: number,
  finalVolumeL: number,
  boilVolumeL = finalVolumeL
): number {
  if (!Array.isArray(hops) || !Number.isFinite(originalGravity) ||
      originalGravity <= 1 || !Number.isFinite(finalVolumeL) || finalVolumeL <= 0) {
    return 0;
  }

  const validBoilVolume =
    Number.isFinite(boilVolumeL) && boilVolumeL > 0 ? boilVolumeL : finalVolumeL;
  const boilGravity =
    1 + ((originalGravity - 1) * finalVolumeL) / validBoilVolume;
  const bigness = 1.65 * Math.pow(0.000125, boilGravity - 1);
  let ibu = 0;

  for (const hop of hops) {
    const amount = numericValue(hop.amount);
    const alpha = numericValue(hop.alpha);
    const time = numericValue(hop.time);
    const temperature = numericValue(hop.temperature);
    if (
      amount === null || amount <= 0 ||
      alpha === null || alpha <= 0 || alpha > 100 ||
      time === null || time < 0
    ) {
      continue;
    }

    let temperatureFactor = 1;
    if (hop.addition_type === "whirlpool") {
      if (temperature === null || temperature < 60 || temperature > 100) continue;
      // Approximate utilization halves for each 10°C drop below boiling.
      temperatureFactor = Math.pow(0.5, (100 - temperature) / 10);
    }

    const boilFactor = ((1 - Math.exp(-0.04 * time)) / 4.15) * temperatureFactor;
    ibu += (amount * 1000 * (alpha / 100) * bigness * boilFactor) / finalVolumeL;
  }

  return Number.isFinite(ibu) ? ibu : 0;
}

export function calcDryHopIBU(
  dryHops: DryHopAddition[],
  finalVolumeL: number
): number {
  if (!Array.isArray(dryHops) || !Number.isFinite(finalVolumeL) || finalVolumeL <= 0) {
    return 0;
  }
  const ibu = dryHops.reduce((total, hop) => {
    const grams = numericValue(hop.amount);
    const days = numericValue(hop.contact);
    const alpha = numericValue(hop.alpha);
    if (
      grams === null || grams <= 0 ||
      days === null || days <= 0 ||
      alpha === null || alpha <= 0 || alpha > 100
    ) {
      return total;
    }
    return total + grams * alpha * 0.00008 * days * (20 / finalVolumeL);
  }, 0);
  return Number.isFinite(ibu) ? ibu : 0;
}

export function calcEBC(
  malts: MaltAddition[],
  finalVolumeL: number
): { ebc: number; warnings: string[] } {
  if (!Array.isArray(malts) || malts.length === 0) {
    return { ebc: 0, warnings: [] };
  }
  if (!Number.isFinite(finalVolumeL) || finalVolumeL <= 0) {
    return { ebc: 0, warnings: malts.map((malt) => malt.name ?? "Unknown malt") };
  }

  const volumeGallons = finalVolumeL / 3.785411784;
  let mcu = 0;
  const warnings: string[] = [];

  for (const malt of malts) {
    const name = malt.name ?? "";
    const ebc = numericValue(malt.ebc);
    const weightKg = maltWeightInKilograms(malt);

    if (ebc === null || ebc < 0) {
      warnings.push(name);
      continue;
    }
    if (weightKg === null) continue;

    const lovibond = ebc === 0 ? 0 : (ebc / 1.97 + 0.76) / 1.3546;
    mcu += ((weightKg / 0.45359237) * lovibond) / volumeGallons;
  }

  const srm = mcu > 0 ? 1.4922 * Math.pow(mcu, 0.6859) : 0;
  const ebc = srm * 1.97;
  return { ebc: Number.isFinite(ebc) ? ebc : 0, warnings };
}
