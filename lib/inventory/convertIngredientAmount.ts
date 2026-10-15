export function convertIngredientAmount(
  amount: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const normalizeUnit = (unit: string) =>
    unit.trim().toLocaleLowerCase().replace(/[.\s]/g, "");
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  const unitFactors: Record<string, { family: string; factor: number }> = {
    kg: { family: "mass", factor: 1000 },
    g: { family: "mass", factor: 1 },
    mg: { family: "mass", factor: 0.001 },
    lb: { family: "mass", factor: 453.59237 },
    lbs: { family: "mass", factor: 453.59237 },
    oz: { family: "mass", factor: 28.349523125 },
    l: { family: "volume", factor: 1000 },
    ml: { family: "volume", factor: 1 },
    gal: { family: "volume", factor: 3785.411784 },
    gallon: { family: "volume", factor: 3785.411784 },
    gallons: { family: "volume", factor: 3785.411784 },
    pcs: { family: "count", factor: 1 },
    pc: { family: "count", factor: 1 },
    piece: { family: "count", factor: 1 },
    pieces: { family: "count", factor: 1 },
    each: { family: "count", factor: 1 },
  };

  if (from === to) return amount;
  const fromFactor = unitFactors[from];
  const toFactor = unitFactors[to];
  if (!fromFactor || !toFactor || fromFactor.family !== toFactor.family) return null;
  return (amount * fromFactor.factor) / toFactor.factor;
}
