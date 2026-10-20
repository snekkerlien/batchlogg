export type WaterIonProfile = {
  calcium: number;
  magnesium: number;
  sodium: number;
  chloride: number;
  sulfate: number;
  bicarbonate: number;
};

export type WaterTreatmentPlan = {
  additions: {
    calciumChloride: number;
    gypsum: number;
    epsomSalt: number;
    bakingSoda: number;
    lacticAcid88: number;
  };
  predicted: WaterIonProfile;
};

export const WATER_ION_LABELS: Record<keyof WaterIonProfile, string> = {
  calcium: "Calcium",
  magnesium: "Magnesium",
  sodium: "Sodium",
  chloride: "Chloride",
  sulfate: "Sulfate",
  bicarbonate: "Bicarbonate",
};

export const WATER_TARGET_PROFILES: Record<string, WaterIonProfile> = {
  "Soft & pale": {
    calcium: 50,
    magnesium: 5,
    sodium: 10,
    chloride: 50,
    sulfate: 50,
    bicarbonate: 30,
  },
  Balanced: {
    calcium: 70,
    magnesium: 10,
    sodium: 15,
    chloride: 70,
    sulfate: 70,
    bicarbonate: 50,
  },
  "Malt-forward": {
    calcium: 75,
    magnesium: 10,
    sodium: 20,
    chloride: 100,
    sulfate: 50,
    bicarbonate: 80,
  },
  "Hop-forward": {
    calcium: 80,
    magnesium: 10,
    sodium: 20,
    chloride: 50,
    sulfate: 150,
    bicarbonate: 30,
  },
};

const SALT_FRACTIONS = {
  calciumChlorideCalcium: 0.2726,
  calciumChlorideChloride: 0.4823,
  gypsumCalcium: 0.2328,
  gypsumSulfate: 0.5579,
  epsomMagnesium: 0.0986,
  epsomSulfate: 0.3896,
  bakingSodaSodium: 0.2737,
  bakingSodaBicarbonate: 0.7262,
};

function gramsForIncrease(
  increaseMgPerL: number,
  volumeL: number,
  ionFraction: number
): number {
  return (increaseMgPerL * volumeL) / (ionFraction * 1000);
}

export function calculateWaterTreatment(
  source: WaterIonProfile,
  target: WaterIonProfile,
  volumeL: number
): WaterTreatmentPlan | null {
  const ions = [...Object.values(source), ...Object.values(target)];
  if (
    !Number.isFinite(volumeL) ||
    volumeL <= 0 ||
    ions.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    return null;
  }

  const calciumChloride = gramsForIncrease(
    Math.max(0, target.chloride - source.chloride),
    volumeL,
    SALT_FRACTIONS.calciumChlorideChloride
  );
  const epsomSalt = gramsForIncrease(
    Math.max(0, target.magnesium - source.magnesium),
    volumeL,
    SALT_FRACTIONS.epsomMagnesium
  );
  const sulfateAfterEpsom =
    source.sulfate +
    (epsomSalt * SALT_FRACTIONS.epsomSulfate * 1000) / volumeL;
  const gypsum = Math.max(
    gramsForIncrease(
      Math.max(0, target.sulfate - sulfateAfterEpsom),
      volumeL,
      SALT_FRACTIONS.gypsumSulfate
    )
  );
  const calciumAfterCalciumChloride =
    source.calcium +
    (calciumChloride * SALT_FRACTIONS.calciumChlorideCalcium * 1000) /
      volumeL;
  const sodiumBicarbonate = Math.max(
    gramsForIncrease(
      Math.max(0, target.sodium - source.sodium),
      volumeL,
      SALT_FRACTIONS.bakingSodaSodium
    ),
    gramsForIncrease(
      Math.max(0, target.bicarbonate - source.bicarbonate),
      volumeL,
      SALT_FRACTIONS.bakingSodaBicarbonate
    )
  );

  const predicted: WaterIonProfile = {
    calcium:
      calciumAfterCalciumChloride +
      (gypsum * SALT_FRACTIONS.gypsumCalcium * 1000) / volumeL,
    magnesium:
      source.magnesium +
      (epsomSalt * SALT_FRACTIONS.epsomMagnesium * 1000) / volumeL,
    sodium:
      source.sodium +
      (sodiumBicarbonate * SALT_FRACTIONS.bakingSodaSodium * 1000) /
        volumeL,
    chloride:
      source.chloride +
      (calciumChloride * SALT_FRACTIONS.calciumChlorideChloride * 1000) /
        volumeL,
    sulfate:
      sulfateAfterEpsom +
      (gypsum * SALT_FRACTIONS.gypsumSulfate * 1000) / volumeL,
    bicarbonate:
      source.bicarbonate +
      (sodiumBicarbonate * SALT_FRACTIONS.bakingSodaBicarbonate * 1000) /
        volumeL,
  };
  const bicarbonateReduction = Math.max(
    0,
    predicted.bicarbonate - target.bicarbonate
  );

  return {
    additions: {
      calciumChloride,
      gypsum,
      epsomSalt,
      bakingSoda: sodiumBicarbonate,
      lacticAcid88:
        ((bicarbonateReduction / 61.0168) * volumeL) / 11.78,
    },
    predicted,
  };
}
