export const MAX_TIMER_MINUTES = 480;

export type ChecklistStep = {
  id: string;
  title: string;
  description: string;
  timerMinutes?: number;
};

const allGrainBeerSteps = [
  {
    id: "prepare",
    title: "Prepare and sanitize equipment",
    description:
      "Clean the kettle, mash tun, fermenter, and anything that will touch cooled wort.",
  },
  {
    id: "heat-strike",
    title: "Heat strike water",
    description:
      "Use your water plan and heat to the strike temperature for your recipe.",
  },
  {
    id: "mash",
    title: "Mash in and rest",
    description:
      "Mix grain and water thoroughly, check mash temperature, then start the timer.",
    timerMinutes: 60,
  },
  {
    id: "sparge",
    title: "Sparge and collect wort",
    description:
      "Rinse the grain bed as planned and collect the pre-boil volume.",
    timerMinutes: 15,
  },
  {
    id: "boil",
    title: "Boil and follow the hop schedule",
    description:
      "Start the timer at the beginning of the boil; add hops and other ingredients per recipe.",
    timerMinutes: 60,
  },
  {
    id: "chill",
    title: "Chill wort to pitching temperature",
    description:
      "Cool promptly, using a sanitized chiller or another safe method.",
    timerMinutes: 20,
  },
  {
    id: "pitch",
    title: "Transfer, aerate, and pitch yeast",
    description:
      "Transfer into the sanitized fermenter, take an original-gravity reading, and pitch yeast.",
  },
  {
    id: "finish",
    title: "Seal, label, and clean up",
    description:
      "Fit the airlock, record the batch details, and clean your equipment.",
  },
] as const satisfies readonly ChecklistStep[];

const kitBeerSteps = [
  {
    id: "prepare",
    title: "Prepare and sanitize equipment",
    description:
      "Clean the kettle, fermenter, and anything that will touch cooled wort.",
  },
  {
    id: "prepare-wort",
    title: "Prepare the kit wort",
    description:
      "Follow the kit instructions to heat water, dissolve the extract, and prepare the wort.",
  },
  {
    id: "boil",
    title: "Boil and follow the hop schedule",
    description:
      "Follow the kit's boil time and add hops or other ingredients as directed.",
    timerMinutes: 60,
  },
  {
    id: "chill",
    title: "Chill wort to pitching temperature",
    description:
      "Cool promptly, using a sanitized chiller or another safe method.",
    timerMinutes: 20,
  },
  {
    id: "pitch",
    title: "Transfer, aerate, and pitch yeast",
    description:
      "Transfer into the sanitized fermenter, take an original-gravity reading, and pitch yeast.",
  },
  {
    id: "finish",
    title: "Seal, label, and clean up",
    description:
      "Fit the airlock, record the batch details, and clean your equipment.",
  },
] as const satisfies readonly ChecklistStep[];

const meadSteps = [
  {
    id: "prepare",
    title: "Prepare and sanitize equipment",
    description:
      "Clean the fermenter and anything that will touch the must.",
  },
  {
    id: "prepare-mead",
    title: "Prepare the must",
    description:
      "Mix honey, water, fruit, and other ingredients according to your recipe.",
  },
  {
    id: "record-gravity",
    title: "Measure and record starting gravity",
    description:
      "Take an original-gravity reading and make any recipe-planned adjustments.",
  },
  {
    id: "pitch",
    title: "Aerate and pitch yeast",
    description:
      "Prepare the yeast as directed, aerate the must if needed, and pitch it.",
  },
  {
    id: "nutrients",
    title: "Note the nutrient schedule",
    description:
      "Record any staggered nutrient additions and their dates from your recipe.",
  },
  {
    id: "seal",
    title: "Fit the airlock and label the batch",
    description:
      "Seal the fermenter, record the batch details, and clean your equipment.",
  },
] as const satisfies readonly ChecklistStep[];

const ciderSteps = [
  {
    id: "prepare",
    title: "Prepare and sanitize equipment",
    description:
      "Clean the fermenter and anything that will touch the juice.",
  },
  {
    id: "prepare-cider",
    title: "Prepare the cider",
    description:
      "Prepare juice and any recipe ingredients, checking any required treatment or additions.",
  },
  {
    id: "record-gravity",
    title: "Measure and record starting gravity",
    description:
      "Take an original-gravity reading and make any recipe-planned adjustments.",
  },
  {
    id: "pitch",
    title: "Pitch yeast",
    description:
      "Prepare and pitch the yeast according to its instructions and your recipe.",
  },
  {
    id: "seal",
    title: "Fit the airlock and label the batch",
    description:
      "Seal the fermenter, record the batch details, and clean your equipment.",
  },
] as const satisfies readonly ChecklistStep[];

const wineSteps = [
  {
    id: "prepare",
    title: "Prepare and sanitize equipment",
    description:
      "Clean the fermenter and anything that will touch the must.",
  },
  {
    id: "prepare-wine",
    title: "Prepare the must",
    description:
      "Prepare fruit, juice, and other ingredients according to your recipe.",
  },
  {
    id: "record-gravity",
    title: "Measure and record starting gravity",
    description:
      "Take an original-gravity reading and make any recipe-planned adjustments.",
  },
  {
    id: "pitch",
    title: "Pitch yeast",
    description:
      "Prepare and pitch the yeast according to its instructions and your recipe.",
  },
  {
    id: "seal",
    title: "Fit the airlock and label the batch",
    description:
      "Seal the fermenter, record the batch details, and clean your equipment.",
  },
] as const satisfies readonly ChecklistStep[];

const seltzerSteps = [
  {
    id: "prepare",
    title: "Prepare and sanitize equipment",
    description:
      "Clean the fermenter and anything that will touch the base or flavoring.",
  },
  {
    id: "prepare-seltzer",
    title: "Prepare the fermentable base",
    description:
      "Dissolve sugar and prepare the base according to your recipe.",
  },
  {
    id: "record-gravity",
    title: "Measure and record starting gravity",
    description:
      "Take an original-gravity reading and make any recipe-planned adjustments.",
  },
  {
    id: "pitch",
    title: "Pitch yeast",
    description:
      "Prepare and pitch the yeast according to its instructions and your recipe.",
  },
  {
    id: "seal",
    title: "Fit the airlock and label the batch",
    description:
      "Seal the fermenter, record the batch details, and clean your equipment.",
  },
] as const satisfies readonly ChecklistStep[];

const otherSteps = [
  {
    id: "prepare",
    title: "Prepare and sanitize equipment",
    description:
      "Clean the fermenter and anything that will touch the batch.",
  },
  {
    id: "prepare-other",
    title: "Prepare ingredients",
    description:
      "Follow the batch recipe and notes to prepare its ingredients.",
  },
  {
    id: "record-gravity",
    title: "Record starting measurements",
    description:
      "Take any relevant starting readings and record them with the batch.",
  },
  {
    id: "pitch",
    title: "Add the culture or fermentation starter",
    description:
      "Follow the batch instructions for preparing and adding the culture.",
  },
  {
    id: "seal",
    title: "Seal, label, and clean up",
    description:
      "Close the vessel as appropriate, record the batch details, and clean your equipment.",
  },
] as const satisfies readonly ChecklistStep[];

export const BREW_DAY_STEPS = {
  "Beer:all_grain": allGrainBeerSteps,
  "Beer:fresh_wort_kit": kitBeerSteps,
  "Beer:malt_extract_kit": kitBeerSteps,
  Braggot: [
    ...allGrainBeerSteps.slice(0, 6),
    {
      id: "add-honey",
      title: "Add honey at the recipe stage",
      description:
        "Add honey and any other ingredients at the stage specified in your recipe.",
    },
    ...allGrainBeerSteps.slice(6),
  ],
  Mead: meadSteps,
  Cider: ciderSteps,
  Wine: wineSteps,
  Seltzer: seltzerSteps,
  Other: otherSteps,
} as const satisfies Record<string, readonly ChecklistStep[]>;

export const SECONDARY_FERMENTATION_STEPS = [
  {
    id: "secondary-sanitize",
    title: "Sanitize the secondary vessel and transfer equipment",
    description:
      "Sanitize the receiving vessel, siphon, tubing, and anything else that will contact the batch.",
  },
  {
    id: "secondary-record-gravity",
    title: "Record gravity before racking",
    description:
      "Take and record a gravity reading before transferring the batch.",
  },
  {
    id: "secondary-rack",
    title: "Rack the batch into secondary",
    description:
      "Transfer gently, leaving sediment behind and minimizing splashing.",
  },
  {
    id: "secondary-additions",
    title: "Add planned fruit or other additions",
    description:
      "Add recipe-planned fruit, flavorings, or other additions and record what you used.",
  },
  {
    id: "secondary-seal",
    title: "Seal, label, and record the secondary start date",
    description:
      "Fit the airlock, label the vessel, and record the date and any additions in the batch notes.",
  },
  {
    id: "secondary-monitor",
    title: "Monitor secondary fermentation",
    description:
      "Check the airlock and batch condition periodically; record readings or observations in the batch notes.",
  },
  {
    id: "secondary-ready",
    title: "Confirm the batch is ready to package",
    description:
      "Check that fermentation is complete and gravity is stable before packaging.",
  },
] as const satisfies readonly ChecklistStep[];

export function getBrewDaySteps(
  batchType: string,
  beerSubtype?: string | null
): readonly ChecklistStep[] {
  const templateKey =
    batchType === "Beer" ? `Beer:${beerSubtype ?? "all_grain"}` : batchType;
  return BREW_DAY_STEPS[templateKey as keyof typeof BREW_DAY_STEPS] ?? otherSteps;
}

export type ChecklistState = {
  completed: string[];
  durations: Record<string, number>;
  timer: {
    stepId: string;
    endsAt: number | null;
    remainingMs: number;
  } | null;
};

export const DEFAULT_DURATIONS: Record<string, number> = {
  mash: 60,
  sparge: 15,
  boil: 60,
  chill: 20,
};

const ALL_STEPS: readonly ChecklistStep[] = Object.values(BREW_DAY_STEPS).flat();
const STEP_IDS = new Set([
  ...ALL_STEPS.map((step) => step.id),
  ...SECONDARY_FERMENTATION_STEPS.map((step) => step.id),
]);
const TIMER_STEP_IDS = new Set(
  ALL_STEPS.filter((step) => step.timerMinutes !== undefined).map((step) => step.id)
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createDefaultChecklistState(boilMinutes?: number): ChecklistState {
  const durations = { ...DEFAULT_DURATIONS };
  if (
    typeof boilMinutes === "number" &&
    Number.isInteger(boilMinutes) &&
    boilMinutes >= 1 &&
    boilMinutes <= MAX_TIMER_MINUTES
  ) {
    durations.boil = boilMinutes;
  }
  return { completed: [], durations, timer: null };
}

export function parseChecklistState(value: unknown): ChecklistState {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error("Saved brew-day checklist data has an unsupported format.");
  }
  if (
    !Array.isArray(value.completed) ||
    !value.completed.every(
      (id) => typeof id === "string" && STEP_IDS.has(id)
    )
  ) {
    throw new Error("Saved brew-day checklist has invalid step data.");
  }
  if (!isRecord(value.durations)) {
    throw new Error("Saved brew-day checklist has invalid timer settings.");
  }

  const durations = { ...DEFAULT_DURATIONS };
  for (const stepId of Object.keys(DEFAULT_DURATIONS)) {
    const duration = value.durations[stepId];
    if (
      typeof duration !== "number" ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > MAX_TIMER_MINUTES
    ) {
      throw new Error("Saved brew-day checklist has an invalid timer duration.");
    }
    durations[stepId] = duration;
  }

  let timer: ChecklistState["timer"] = null;
  if (value.timer !== null) {
    if (
      !isRecord(value.timer) ||
      typeof value.timer.stepId !== "string" ||
      !TIMER_STEP_IDS.has(value.timer.stepId) ||
      (value.timer.endsAt !== null &&
        (typeof value.timer.endsAt !== "number" ||
          !Number.isFinite(value.timer.endsAt))) ||
      typeof value.timer.remainingMs !== "number" ||
      !Number.isFinite(value.timer.remainingMs) ||
      value.timer.remainingMs < 0 ||
      value.timer.remainingMs > MAX_TIMER_MINUTES * 60_000
    ) {
      throw new Error("Saved brew-day checklist has invalid timer data.");
    }
    timer = {
      stepId: value.timer.stepId,
      endsAt: value.timer.endsAt,
      remainingMs: value.timer.remainingMs,
    };
  }

  return {
    completed: [...new Set(value.completed as string[])],
    durations,
    timer,
  };
}
