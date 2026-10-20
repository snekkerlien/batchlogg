export type BrewWaterPlanInput = {
  targetFermenterVolumeL: number;
  boilTimeMinutes: number;
  boilOffRateLPerHour: number;
  kettleLossL: number;
  grainBillKg: number;
  grainAbsorptionLPerKg: number;
  mashRatioLPerKg: number;
  mashTunDeadSpaceL: number;
};

export type BrewWaterPlan = {
  boilOffL: number;
  preBoilVolumeL: number;
  mashWaterL: number;
  spargeWaterL: number;
  totalWaterL: number;
};

export function calculateBrewWaterPlan(
  input: BrewWaterPlanInput
): BrewWaterPlan | null {
  const values = Object.values(input);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;
  if (
    input.targetFermenterVolumeL <= 0 ||
    input.boilTimeMinutes <= 0 ||
    input.mashRatioLPerKg <= 0
  ) {
    return null;
  }

  const boilOffL =
    input.boilOffRateLPerHour * (input.boilTimeMinutes / 60);
  const preBoilVolumeL =
    input.targetFermenterVolumeL + input.kettleLossL + boilOffL;
  const grainAbsorptionL =
    input.grainBillKg * input.grainAbsorptionLPerKg;
  const mashWaterL = input.grainBillKg * input.mashRatioLPerKg;
  const totalWaterL =
    preBoilVolumeL + grainAbsorptionL + input.mashTunDeadSpaceL;
  const spargeWaterL = totalWaterL - mashWaterL;

  if (spargeWaterL < 0) return null;

  return {
    boilOffL,
    preBoilVolumeL,
    mashWaterL,
    spargeWaterL,
    totalWaterL,
  };
}
