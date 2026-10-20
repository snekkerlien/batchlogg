import { XMLParser } from "fast-xml-parser";

export type ImportedRecipe = {
  type: string;
  beer_subtype: string;
  name: string;
  volume: number;
  og: number | null;
  fg: number | null;
  abv: number | null;
  beer_style: string | null;
  boil_time: number | null;
  boil_volume: number | null;
  malts: Record<string, unknown>[];
  hops: Record<string, unknown>[];
  dry_hops: Record<string, unknown>[];
  yeast: string;
  additives: string;
  full_process: string;
  notes: string;
  ingredients: unknown;
  steps: unknown[];
};

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: true,
  processEntities: false,
});

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function list(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return fallback;
}

function number(value: unknown): number | null {
  const candidate =
    typeof value === "object" && value !== null && "value" in value
      ? (value as { value?: unknown }).value
      : value;
  if (typeof candidate !== "string" && typeof candidate !== "number") return null;
  const parsed = Number(String(candidate).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function amountIn(value: unknown, targetUnit: "g" | "kg"): number | null {
  const amount = record(value);
  const parsed = number(value);
  if (parsed === null) return null;
  const unit = text(amount.unit).toLowerCase();
  if (targetUnit === "g") {
    if (["kg", "kilogram", "kilograms"].includes(unit)) return parsed * 1000;
    if (["oz", "ounce", "ounces"].includes(unit)) return parsed * 28.349523125;
    return parsed;
  }
  if (["g", "gram", "grams"].includes(unit)) return parsed / 1000;
  if (["lb", "lbs", "pound", "pounds"].includes(unit)) return parsed * 0.45359237;
  return parsed;
}

function ingredientMassIn(
  value: unknown,
  fallbackUnit: unknown,
  targetUnit: "g" | "kg"
): number | null {
  const amount = record(value);
  return amountIn(
    {
      value: number(value),
      unit: text(amount.unit, text(fallbackUnit, "kg")),
    },
    targetUnit
  );
}

function volumeInLiters(value: unknown): number | null {
  const amount = record(value);
  const parsed = number(value);
  if (parsed === null) return null;
  const unit = text(amount.unit).toLowerCase();
  if (["gal", "gallon", "gallons", "us gal"].includes(unit)) return parsed * 3.785411784;
  if (["qt", "quart", "quarts"].includes(unit)) return parsed * 0.946352946;
  if (["ml", "milliliter", "milliliters"].includes(unit)) return parsed / 1000;
  return parsed;
}

function lovibondToEbc(value: unknown): number | null {
  const lovibond = number(value);
  if (lovibond === null || lovibond < 0) return null;
  return lovibond === 0 ? 0 : Math.max(0, 1.97 * (1.3546 * lovibond - 0.76));
}

function ebcToLovibond(value: unknown): number | null {
  const ebc = number(value);
  if (ebc === null || ebc < 0) return null;
  return ebc === 0 ? 0 : (ebc / 1.97 + 0.76) / 1.3546;
}

function recipeType(value: unknown): string {
  const normalized = text(value, "Beer").toLowerCase();
  const types: Record<string, string> = {
    beer: "Beer",
    mead: "Mead",
    cider: "Cider",
    wine: "Wine",
    seltzer: "Seltzer",
    "hard seltzer": "Seltzer",
    braggot: "Braggot",
    other: "Other",
    kombucha: "Other",
    soda: "Other",
  };
  return types[normalized] ?? "Beer";
}

function baseRecipe(): ImportedRecipe {
  return {
    type: "Beer",
    beer_subtype: "all_grain",
    name: "Imported recipe",
    volume: 20,
    og: null,
    fg: null,
    abv: null,
    beer_style: null,
    boil_time: null,
    boil_volume: null,
    malts: [],
    hops: [],
    dry_hops: [],
    yeast: "",
    additives: "",
    full_process: "",
    notes: "",
    ingredients: [],
    steps: [],
  };
}

function fromBeerXmlRecipe(value: unknown): ImportedRecipe {
  const recipe = record(value);
  const imported = baseRecipe();
  imported.name = text(recipe.NAME, imported.name);
  const beerSubtype = text(recipe.TYPE).toLowerCase();
  if (beerSubtype === "extract") {
    imported.beer_subtype = "malt_extract_kit";
  } else if (beerSubtype === "partial mash") {
    imported.beer_subtype = "all_grain";
  }
  imported.volume = volumeInLiters(recipe.BATCH_SIZE) ?? imported.volume;
  imported.boil_volume = volumeInLiters(recipe.BOIL_SIZE);
  imported.boil_time = number(recipe.BOIL_TIME);
  imported.og = number(recipe.OG);
  imported.fg = number(recipe.FG);
  imported.abv = number(recipe.ABV);
  imported.beer_style = text(record(recipe.STYLE).NAME) || null;
  imported.malts = list(record(recipe.FERMENTABLES).FERMENTABLE).flatMap((entry) => {
    const malt = record(entry);
    const amount = amountIn(malt.AMOUNT, "kg");
    const name = text(malt.NAME);
    if (!name || amount === null) return [];
    return [{ name, amount, ebc: lovibondToEbc(malt.COLOR) }];
  });

  for (const entry of list(record(recipe.HOPS).HOP)) {
    const hop = record(entry);
    const amountKg = number(hop.AMOUNT);
    const amount = amountKg === null ? null : amountKg * 1000;
    const name = text(hop.NAME);
    if (!name || amount === null) continue;
    const use = text(hop.USE).toLowerCase();
    const importedHop = {
      name,
      amount,
      alpha: number(hop.ALPHA),
      time: number(hop.TIME),
    };
    if (use.includes("dry")) {
      imported.dry_hops.push({
        ...importedHop,
        contact: number(hop.TIME),
      });
    } else {
      imported.hops.push({
        ...importedHop,
        addition_type: use.includes("whirlpool") ? "whirlpool" : "boil",
        temperature: null,
      });
    }
  }

  imported.yeast = list(record(recipe.YEASTS).YEAST)
    .map((entry) => text(record(entry).NAME))
    .filter(Boolean)
    .join(", ");
  imported.additives = list(record(recipe.MISCS).MISC)
    .map((entry) => {
      const misc = record(entry);
      const amount = number(misc.AMOUNT);
      return `${text(misc.NAME)}${amount === null ? "" : `: ${amount} ${text(misc.AMOUNT_IS_WEIGHT)}`}`;
    })
    .filter(Boolean)
    .join("\n");
  imported.full_process = text(recipe.MASH_NOTES);
  imported.notes = [text(recipe.NOTES), text(recipe.TASTE_NOTES)]
    .filter(Boolean)
    .join("\n\n");
  return imported;
}

function fromBeerJsonRecipe(value: unknown): ImportedRecipe {
  const recipe = record(value);
  const imported = baseRecipe();
  imported.name = text(recipe.name, imported.name);
  imported.type = recipeType(recipe.type);
  const sourceType = text(recipe.type).toLowerCase();
  if (sourceType === "extract") {
    imported.beer_subtype = "malt_extract_kit";
  } else if (sourceType === "partial mash") {
    imported.beer_subtype = "all_grain";
  }
  imported.volume =
    volumeInLiters(recipe.batch_size ?? recipe.batchSize) ?? imported.volume;
  const boil = record(recipe.boil);
  imported.boil_volume = volumeInLiters(
    recipe.boil_size ?? recipe.boil_volume ?? boil.pre_boil_size
  );
  imported.boil_time = number(
    recipe.boil_time ?? boil.boil_time
  );
  imported.og = number(recipe.original_gravity ?? recipe.og);
  imported.fg = number(recipe.final_gravity ?? recipe.fg);
  imported.abv = number(recipe.alcohol_by_volume ?? recipe.abv);
  imported.beer_style =
    text(record(recipe.style).name ?? recipe.style) || null;
  const ingredients = record(recipe.ingredients);
  imported.malts = list(
    recipe.fermentables ?? ingredients.fermentable_additions
  ).flatMap((entry) => {
    const fermentable = record(entry);
    const amount = amountIn(fermentable.amount, "kg");
    const name = text(fermentable.name);
    if (!name || amount === null) return [];
    return [{
      name,
      amount,
      ebc: number(record(fermentable.color).value ?? fermentable.ebc),
    }];
  });
  for (const entry of list(recipe.hops ?? ingredients.hop_additions)) {
    const hop = record(entry);
    const amount = amountIn(hop.amount, "g");
    const name = text(hop.name);
    if (!name || amount === null) continue;
    const timing = record(hop.timing);
    const use = text(timing.use ?? hop.use ?? hop.addition_type).toLowerCase();
    const hopTime = number(timing.duration ?? timing.time ?? hop.time);
    const importedHop = {
      name,
      amount,
      alpha: number(record(hop.alpha_acid).value ?? hop.alpha),
      time: hopTime,
    };
    if (use.includes("dry") || use === "add_to_fermentation") {
      imported.dry_hops.push({
        ...importedHop,
        contact: number(timing.duration ?? hop.contact_time ?? hop.time),
      });
    } else {
      imported.hops.push({
        ...importedHop,
        addition_type: use.includes("whirlpool") ? "whirlpool" : "boil",
        temperature: number(hop.temperature),
      });
    }
  }
  imported.yeast = list(
    recipe.cultures ?? ingredients.culture_additions ?? recipe.yeasts
  )
    .map((entry) => text(record(entry).name ?? entry))
    .filter(Boolean)
    .join(", ");
  imported.additives = list(
    recipe.miscs ?? ingredients.miscellaneous_additions ?? recipe.additives
  )
    .map((entry) => {
      const misc = record(entry);
      return text(misc.name ?? entry);
    })
    .filter(Boolean)
    .join("\n");
  imported.full_process = list(record(recipe.mash).steps ?? recipe.steps)
    .map((entry) => {
      const step = record(entry);
      return text(step.name ?? step.description ?? entry);
    })
    .filter(Boolean)
    .join("\n");
  imported.notes = text(recipe.notes);
  if (!["Beer", "Braggot"].includes(imported.type)) {
    imported.ingredients = imported.malts.map(({ name, amount }) => ({
      name,
      amount,
      unit: "kg",
    }));
  }
  return imported;
}

export function parseBeerXml(content: string): ImportedRecipe[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(content)) {
    throw new Error("BeerXML files with document type or entity declarations are not supported.");
  }
  const parsed = record(xmlParser.parse(content));
  const recipes = list(record(parsed.RECIPES).RECIPE);
  if (!recipes.length) throw new Error("No BeerXML recipes were found in this file.");
  return recipes.map(fromBeerXmlRecipe);
}

export function parseBeerJson(content: string): ImportedRecipe[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  const root = record(record(parsed).beerjson ?? parsed);
  const recipes = list(root.recipes);
  if (recipes.length) return recipes.map(fromBeerJsonRecipe);
  if (typeof root.name === "string") return [fromBeerJsonRecipe(root)];
  throw new Error("No BeerJSON recipe was found in this file.");
}

function xmlEscape(value: unknown): string {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xmlCollection(tag: string, entries: unknown[], render: (entry: unknown) => string) {
  return `<${tag}>${entries.map(render).join("")}</${tag}>`;
}

export function recipeToBeerXml(recipe: Record<string, unknown>): string {
  const malts = list(recipe.malts);
  const hops = [...list(recipe.hops), ...list(recipe.dry_hops)];
  const yeastNames = text(recipe.yeast).split(",").map((name) => name.trim()).filter(Boolean);
  const ingredients = record(recipe.ingredients);
  const subtype = text(ingredients.beer_subtype, "all_grain").toLowerCase();
  const beerXmlType =
    subtype === "extract" ||
    subtype === "malt_extract_kit" ||
    subtype === "fresh_wort_kit"
      ? "Extract"
      : subtype === "partial_mash"
        ? "Partial Mash"
        : "All Grain";
  const beerStyle = text(ingredients.beer_style ?? recipe.beer_style);
  const recipeXml = [
    `<NAME>${xmlEscape(recipe.name)}</NAME>`,
    `<TYPE>${beerXmlType}</TYPE>`,
    `<BATCH_SIZE>${xmlEscape(recipe.volume ?? 20)}</BATCH_SIZE>`,
    recipe.boil_volume == null ? "" : `<BOIL_SIZE>${xmlEscape(recipe.boil_volume)}</BOIL_SIZE>`,
    recipe.boil_time == null ? "" : `<BOIL_TIME>${xmlEscape(recipe.boil_time)}</BOIL_TIME>`,
    recipe.og == null ? "" : `<OG>${xmlEscape(recipe.og)}</OG>`,
    recipe.fg == null ? "" : `<FG>${xmlEscape(recipe.fg)}</FG>`,
    recipe.abv == null ? "" : `<ABV>${xmlEscape(recipe.abv)}</ABV>`,
    `<STYLE><NAME>${xmlEscape(beerStyle)}</NAME></STYLE>`,
    xmlCollection("FERMENTABLES", malts, (entry) => {
      const malt = record(entry);
      return `<FERMENTABLE><NAME>${xmlEscape(malt.name)}</NAME><TYPE>Grain</TYPE><AMOUNT>${xmlEscape(ingredientMassIn(malt.amount, malt.unit, "kg"))}</AMOUNT><COLOR>${xmlEscape(ebcToLovibond(malt.ebc))}</COLOR></FERMENTABLE>`;
    }),
    xmlCollection("HOPS", hops, (entry) => {
      const hop = record(entry);
      const dryHop = list(recipe.dry_hops).includes(entry);
      const grams = number(hop.amount);
      const kilograms = grams === null ? "" : grams / 1000;
      return `<HOP><NAME>${xmlEscape(hop.name)}</NAME><VERSION>1</VERSION><ALPHA>${xmlEscape(hop.alpha)}</ALPHA><AMOUNT>${xmlEscape(kilograms)}</AMOUNT><USE>${dryHop ? "Dry Hop" : hop.addition_type === "whirlpool" ? "Aroma" : "Boil"}</USE><TIME>${xmlEscape(hop.time ?? hop.contact)}</TIME></HOP>`;
    }),
    xmlCollection("YEASTS", yeastNames, (name) => `<YEAST><NAME>${xmlEscape(name)}</NAME></YEAST>`),
    `<NOTES>${xmlEscape(recipe.notes)}</NOTES>`,
    `<MASH_NOTES>${xmlEscape(recipe.full_process)}</MASH_NOTES>`,
  ].join("");
  return `<?xml version="1.0" encoding="UTF-8"?><RECIPES><RECIPE>${recipeXml}</RECIPE></RECIPES>`;
}

export function recipeToBeerJson(recipe: Record<string, unknown>) {
  const amount = (value: unknown, unit: string) => ({ value: number(value), unit });
  const ingredients = record(recipe.ingredients);
  const type = text(recipe.type, "Beer");
  const beerSubtype = text(ingredients.beer_subtype, "all_grain");
  const beerStyle = text(ingredients.beer_style ?? recipe.beer_style);
  const exportedType =
    type === "Beer"
      ? beerSubtype === "fresh_wort_kit" || beerSubtype === "malt_extract_kit"
        ? "extract"
        : beerSubtype === "partial_mash"
          ? "partial mash"
          : "all grain"
      : type === "Mead"
        ? "mead"
        : type === "Cider"
          ? "cider"
          : type === "Wine"
            ? "wine"
            : "other";
  const dryHops = list(recipe.dry_hops);
  const hops = [...list(recipe.hops), ...dryHops];
  const fermentables =
    type === "Beer" || type === "Braggot"
      ? list(recipe.malts)
      : Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];
  const fermentableType =
    type === "Mead"
      ? "honey"
      : type === "Cider" || type === "Wine"
        ? "juice"
        : type === "Beer" || type === "Braggot"
            ? "grain"
            : "other";
  const styleType =
    type === "Mead"
      ? "mead"
      : type === "Cider"
        ? "cider"
        : type === "Wine"
            ? "wine"
            : type === "Beer"
              ? "beer"
              : "other";
  return {
    beerjson: {
      version: "1.0",
      recipes: [
        {
          name: text(recipe.name),
          type: exportedType,
          author: "Batchlogg",
          efficiency: { brewhouse: amount(75, "%") },
          ...(beerStyle
            ? {
                style: {
                  name: beerStyle,
                  category: "Unspecified",
                  style_guide: "Unspecified",
                  type: styleType,
                },
              }
            : {}),
          batch_size: amount(recipe.volume, "l"),
          ingredients: {
            fermentable_additions: list(fermentables).flatMap((entry) => {
              const malt = record(entry);
              const name = text(malt.name);
              const quantity = ingredientMassIn(malt.amount, malt.unit, "kg");
              if (!name || quantity === null) return [];
              return {
                name,
                type: fermentableType,
                amount: amount(quantity, "kg"),
                yield: { potential: amount(1, "sg") },
                color: amount(number(malt.ebc) ?? 0, "EBC"),
              };
            }),
            hop_additions: hops.flatMap((entry) => {
              const hop = record(entry);
              const dryHop = dryHops.includes(entry);
              const hopAmount = number(hop.amount);
              if (!text(hop.name) || hopAmount === null) return [];
              const alpha = amount(number(hop.alpha) ?? 0, "%");
              const minutes = number(dryHop ? hop.contact : hop.time);
              return [{
                name: text(hop.name),
                alpha_acid: alpha,
                amount: amount(hopAmount, "g"),
                timing: {
                  use: dryHop ? "add_to_fermentation" : "add_to_boil",
                  ...(minutes === null
                    ? {}
                    : dryHop
                      ? { duration: amount(Math.max(0, Math.round(minutes)), "day") }
                      : { duration: amount(Math.max(0, Math.round(minutes)), "min") }),
                },
              }];
            }),
          },
          ...(recipe.boil_time == null
            ? {}
            : {
                boil: {
                  ...(recipe.boil_volume == null
                    ? {}
                    : { pre_boil_size: amount(recipe.boil_volume, "l") }),
                  ...(recipe.boil_time == null
                    ? {}
                    : {
                        boil_time: {
                          value: Math.max(0, Math.round(number(recipe.boil_time) ?? 0)),
                          unit: "min",
                        },
                      }),
                },
              }),
          ...(recipe.og == null ? {} : { original_gravity: amount(recipe.og, "sg") }),
          ...(recipe.fg == null ? {} : { final_gravity: amount(recipe.fg, "sg") }),
          ...(recipe.abv == null
            ? {}
            : { alcohol_by_volume: amount(recipe.abv, "%") }),
          notes: [text(recipe.notes), text(recipe.full_process)]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    },
  };
}
