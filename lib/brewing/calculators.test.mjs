import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateAbvFromGravity,
  calculateDilutedAbv,
  calculateDilutedGravity,
  calculateFermentableForAbv,
  calculateOgForAbv,
  calculateRefractometerCorrection,
  calculateVolumeForTargetAbv,
  calculateWortCorrectionFactor,
  convertGravityToSpecificGravity,
} from "./calculators.ts";
import { getCalculatorInputError, parseCalculatorNumber } from "./calculatorValidation.ts";
import { calculateBrewWaterPlan } from "./waterPlanning.ts";
import { calculateWaterTreatment, WATER_TARGET_PROFILES } from "./waterChemistry.ts";

test("input validation distinguishes blanks, invalid text, ranges, and zero", () => {
  assert.ok(Number.isNaN(parseCalculatorNumber("")));
  assert.equal(parseCalculatorNumber("1,050"), 1.05);
  assert.equal(getCalculatorInputError([{ label: "ABV", value: "", min: 0, max: 100 }]), null);
  assert.match(getCalculatorInputError([{ label: "ABV", value: "10abc" }]), /valid finite number/);
  assert.match(getCalculatorInputError([{ label: "ABV", value: "Infinity" }]), /valid finite number/);
  assert.match(getCalculatorInputError([{ label: "ABV", value: "-1", min: 0 }]), /at least 0/);
  assert.match(getCalculatorInputError([{ label: "ABV", value: "101", max: 100 }]), /no more than 100/);
  assert.match(getCalculatorInputError([{ label: "Volume", value: "0", positive: true }]), /greater than zero/);
  assert.equal(getCalculatorInputError([{ label: "Addition", value: "0", min: 0 }]), null);
});

test("ABV uses converted gravity and rejects impossible gravity differences", () => {
  assert.ok(Math.abs(calculateAbvFromGravity(1.05, 1.01) - 5.25) < 1e-10);
  assert.equal(calculateAbvFromGravity(1.01, 1.05), null);
  assert.equal(calculateAbvFromGravity(1.05, 1.05), 0);
  assert.equal(calculateAbvFromGravity(2, 0.8), null);
  assert.equal(convertGravityToSpecificGravity(50, "oechsle"), 1.05);
  for (const scale of ["brix", "plato", "balling"]) {
    assert.ok(Math.abs(convertGravityToSpecificGravity(12.4, scale) - 1.05) < 0.001);
  }
  assert.equal(convertGravityToSpecificGravity(0, "sg"), null);
  assert.equal(convertGravityToSpecificGravity(Number.NaN, "sg"), null);
});

test("dilution accepts no addition and rejects invalid ABV, volumes, and overflow", () => {
  assert.equal(calculateDilutedAbv(10, 20, 5), 8);
  assert.equal(calculateDilutedAbv(10, 20, 0), 10);
  assert.equal(calculateDilutedAbv(0, 20, 5), 0);
  for (const inputs of [[101, 20, 5], [-1, 20, 5], [10, 0, 5], [10, 20, -1], [10, 1e308, 1e308]]) {
    assert.equal(calculateDilutedAbv(...inputs), null);
  }
});

test("target ABV handles dilution, fortification, already-at-target, and unreachable targets", () => {
  assert.equal(calculateVolumeForTargetAbv(10, 20, 0, 8), 5);
  assert.equal(calculateVolumeForTargetAbv(10, 20, 40, 20), 10);
  assert.equal(calculateVolumeForTargetAbv(10, 20, 40, 10), 0);
  assert.equal(calculateVolumeForTargetAbv(10, 20, 10, 10), 0);
  for (const inputs of [[10, 20, 0, 0], [10, 20, 40, 40], [10, 20, 40, 50], [10, 20, 10, 20], [10, 0, 40, 20]]) {
    assert.equal(calculateVolumeForTargetAbv(...inputs), null);
  }
});

test("OG dilution conserves gravity points and requires unfermented wort", () => {
  assert.ok(Math.abs(calculateDilutedGravity(1.1, 4, 1) - 1.08) < 1e-10);
  assert.equal(calculateDilutedGravity(1.05, 20, 0), 1.05);
  assert.equal(calculateDilutedGravity(0.99, 20, 5), null);
  assert.equal(calculateDilutedGravity(1.05, 0, 5), null);
  assert.equal(calculateDilutedGravity(1.05, 20, -5), null);
  assert.equal(calculateDilutedGravity(1.05, 1e308, 1e308), null);
});

test("fermentable estimates use final volume and selected yield without nonfinite outputs", () => {
  const sugar = calculateFermentableForAbv(10, 12, "sugar");
  const honey = calculateFermentableForAbv(10, 12, "honey");
  assert.ok(sugar > 2300 && sugar < 2400);
  assert.ok(Math.abs(honey / sugar - 46 / 35) < 1e-10);
  assert.ok(Math.abs(calculateOgForAbv(12) - 1.0914285714) < 1e-9);
  assert.equal(calculateFermentableForAbv(10, 0, "sugar"), 0);
  assert.equal(calculateFermentableForAbv(0, 12, "sugar"), null);
  assert.equal(calculateFermentableForAbv(10, 101, "sugar"), null);
  assert.equal(calculateFermentableForAbv(1e308, 100, "sugar"), null);
});

test("water plan balances volumes and rejects negative sparge, zero grain, and overflow", () => {
  const input = {
    targetFermenterVolumeL: 20, boilTimeMinutes: 60,
    boilOffRateLPerHour: 3, kettleLossL: 2, grainBillKg: 5,
    grainAbsorptionLPerKg: 0.8, mashRatioLPerKg: 3, mashTunDeadSpaceL: 1,
  };
  assert.deepEqual(calculateBrewWaterPlan(input), {
    boilOffL: 3, preBoilVolumeL: 25, mashWaterL: 15, spargeWaterL: 15, totalWaterL: 30,
  });
  assert.equal(calculateBrewWaterPlan({ ...input, mashRatioLPerKg: 20 }), null);
  assert.equal(calculateBrewWaterPlan({ ...input, grainBillKg: 0 }), null);
  assert.equal(calculateBrewWaterPlan({ ...input, kettleLossL: -1 }), null);
  assert.equal(calculateBrewWaterPlan({ ...input, boilOffRateLPerHour: 1e308, boilTimeMinutes: 120 }), null);
});

test("water chemistry supports genuine zeros, rejects invalid and nonfinite plans", () => {
  const source = { calcium: 0, magnesium: 0, sodium: 0, chloride: 0, sulfate: 0, bicarbonate: 0 };
  const plan = calculateWaterTreatment(source, WATER_TARGET_PROFILES.Balanced, 30);
  assert.ok(plan.additions.calciumChloride > 0);
  assert.equal(calculateWaterTreatment(source, WATER_TARGET_PROFILES.Balanced, 0), null);
  assert.equal(calculateWaterTreatment({ ...source, calcium: -1 }, WATER_TARGET_PROFILES.Balanced, 30), null);
  assert.equal(calculateWaterTreatment(source, { ...source, chloride: 1e308 }, 1e308), null);
});

test("refractometer correction and calibration validate ranges and impossible readings", () => {
  const result = calculateRefractometerCorrection(12.4, 6, 1.04);
  assert.ok(result.finalGravity < result.originalGravity);
  assert.ok(result.abv > 4 && result.abv < 6);
  assert.equal(calculateRefractometerCorrection(12.4, 6, 0), null);
  assert.equal(calculateRefractometerCorrection(12.4, 36, 1.04), null);
  assert.equal(calculateRefractometerCorrection(5, 12, 1.04), null);
  const factor = calculateWortCorrectionFactor(12.4, 1.048);
  assert.ok(factor >= 0.9 && factor <= 1.1);
  assert.equal(calculateWortCorrectionFactor(12.4, 1), null);
});
