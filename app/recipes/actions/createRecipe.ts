"use server";

import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";

// ⭐ Import malt + humle databasen fra egen fil
import { MALTS_DB, HOPS_DB, MALT_ALIASES, HOPS_ALIASES } from "./data";

// -----------------------------
// Levenshtein fuzzy match
// -----------------------------
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

function normalizeMaltName(name: string): string {
  const key = name.toLowerCase().trim();
  return MALT_ALIASES[key] || name;
}

function fuzzyMatchMalt(name: string) {
  const normalized = normalizeMaltName(name).toLowerCase().trim();

  let best: any = null;
  let bestScore = Infinity;

  for (const malt of MALTS_DB) {
    const dbName = malt.name.toLowerCase();
    const dist = levenshtein(normalized, dbName);

    if (dist < bestScore) {
      bestScore = dist;
      best = malt;
    }
  }

  if (!best || bestScore > 3) {
    return {
      name,
      lovibond: 0,
      warning: true,
    };
  }

  return {
    ...best,
    warning: false,
  };
}

// -----------------------------
// IBU (Tinseth)
// -----------------------------
function calcIBU(hops: any[], og: number, volumeL: number) {
  if (!hops || hops.length === 0) return 0;

  const bigness = 1.65 * Math.pow(0.000125, og - 1.0);
  let ibu = 0;

  for (const hop of hops) {
    const match = HOPS_DB.find(
      (h) => h.name.toLowerCase() === hop.name.toLowerCase()
    );
    const aa = match ? match.alpha : 0.05;

    const boil = hop.time ? Number(hop.time) : 60;
    const boilFactor = (1 - Math.exp(-0.04 * boil)) / 4.15;
    const utilization = bigness * boilFactor;

    ibu += (Number(hop.amount) * 1000 * aa * utilization) / volumeL;
  }

  return ibu;
}

// -----------------------------
// ⭐ Brewfather-style Dry Hop IBU
// -----------------------------
function calcDryHopIBU(dryHops: any[]) {
  if (!dryHops || dryHops.length === 0) return 0;

  let ibu = 0;

  for (const hop of dryHops) {
    const grams = Number(hop.amount) || 0;
    const days = Number(hop.contact) || 0;

    // Brewfather polyphenol bitterness model
    ibu += grams * 0.0008 * days;
  }

  return ibu;
}

// -----------------------------
// EBC (MCU → SRM → EBC)
// -----------------------------
function calcEBC(malts: any[], volumeL: number) {
  if (!malts || malts.length === 0) return { ebc: 0, warnings: [] };

  const L_PER_GAL = 3.78541;
  const KG_PER_LB = 0.453592;

  let mcu = 0;
  const warnings: string[] = [];

  for (const malt of malts) {
    const match = fuzzyMatchMalt(malt.name);

    if (match.warning) {
      warnings.push(malt.name);
    }

    const lovibond = match.lovibond;
    const weight_lb = Number(malt.amount) / KG_PER_LB;
    const volume_gal = volumeL / L_PER_GAL;

    mcu += (weight_lb * lovibond) / volume_gal;
  }

  const srm = 1.4922 * Math.pow(mcu, 0.6859);
  const ebc = srm * 1.97;

  return { ebc, warnings };
}

// -----------------------------
// ⭐ Brewfather-style Dry Hop EBC
// -----------------------------
function calcDryHopEBC(dryHops: any[]) {
  if (!dryHops || dryHops.length === 0) return 0;

  let ebc = 0;

  for (const hop of dryHops) {
    const grams = Number(hop.amount) || 0;

    // Brewfather hop color contribution
    ebc += grams * 0.002;
  }

  return ebc;
}

// -----------------------------
// MAIN FUNCTION
// -----------------------------
export async function createRecipe(formData: FormData) {
  const { supabase } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
    return;
  }

  const user_id = user.id;

  // Core
  const type = formData.get("type") as string;
  const name = formData.get("name") as string;

  const ogRaw = formData.get("og") as string | null;
  const fgRaw = formData.get("fg") as string | null;
  const volumeRaw = formData.get("volume") as string | null;

  const og = ogRaw ? parseFloat(ogRaw) : null;
  const fg = fgRaw ? parseFloat(fgRaw) : null;
  const volume = volumeRaw ? parseFloat(volumeRaw) : null;

  // ⭐ Automatic ABV
  const abv = og !== null && fg !== null ? (og - fg) * 131.25 : null;

  // Shared
  const additives = formData.get("additives") as string;
  const full_process = formData.get("full_process") as string;
  const notes = formData.get("notes") as string;
  const yeast = formData.get("yeast") as string;

  // Mead
  const honey_type = formData.get("honey_type") as string;
  const honey_amount = formData.get("honey_amount") as string;

  const fruits_json = formData.get("fruits_json") as string;
  const fruits = fruits_json ? JSON.parse(fruits_json) : null;

  // Cider / Wine / Seltzer
  const juice_type = formData.get("juice_type") as string;
  const sugar_amount = formData.get("sugar_amount") as string;

  // Beer / Braggot
  const malts_json = formData.get("malts_json") as string;
  const malts = malts_json ? JSON.parse(malts_json) : null;

  const hops_json = formData.get("hops_json") as string;
  const hopsRaw = hops_json ? JSON.parse(hops_json) : [];

  const hops = hopsRaw.map((h: any) => {
  const alias = HOPS_ALIASES[h.name.toLowerCase()];
  const realName = alias || h.name;

  const match = HOPS_DB.find(x => x.name.toLowerCase() === realName.toLowerCase());

  return {
    ...h,
    name: realName,
    alpha: match ? match.alpha : 0.05
  };
});






  // ⭐ NEW: Dry hops
  const dry_hops_json = formData.get("dry_hops_json") as string;
  const dry_hops = dry_hops_json ? JSON.parse(dry_hops_json) : null;

  const boil_time = formData.get("boil_time") as string;
  const boilVolumeRaw = formData.get("boil_volume_l") as string;
  const boil_volume = boilVolumeRaw ? parseFloat(boilVolumeRaw) : null;

  // ⭐ Automatic IBU/EBC for beer/braggot
  const ibuBoil =
  (type === "Beer" || type === "Braggot") && og && volume
    ? calcIBU(hops || [], og, boil_volume ?? volume)
    : 0

  const ibuDry =
    (type === "Beer" || type === "Braggot")
      ? calcDryHopIBU(dry_hops || [])
      : 0;

  const ibu = ibuBoil + ibuDry;

  const ebcResult =
    (type === "Beer" || type === "Braggot") && volume
      ? calcEBC(malts || [], boil_volume ?? volume)
      : { ebc: 0, warnings: [] };

  const ebcDry =
    (type === "Beer" || type === "Braggot")
      ? calcDryHopEBC(dry_hops || [])
      : 0;

  const ebc = ebcResult.ebc + ebcDry;

  const maltWarnings = ebcResult.warnings;

  // ⭐ STOPP LAGRING HVIS DET ER FEIL
  if (maltWarnings.length > 0) {
    return {
      success: false,
      maltWarnings,
    };
  }

  // Other
  const ingredients_json = formData.get("ingredients_json") as string;
  const ingredients = ingredients_json ? JSON.parse(ingredients_json) : null;

  const steps_json = formData.get("steps_json") as string;
  const steps = steps_json ? JSON.parse(steps_json) : null;

  // Secondary
  const had_secondary = formData.get("had_secondary") === "true";
  const secondary_additions = formData.get("secondary_additions") as string;
  const secondary_notes = formData.get("secondary_notes") as string;

  const { error } = await supabase.from("recipes").insert({
    user_id,
    type,
    name,
    og,
    fg,
    abv,
    ibu,
    ebc,
    volume,

    honey_type,
    honey_amount,
    fruits,

    juice_type,
    sugar_amount,

    malts,
    hops,
    dry_hops,

    boil_time,
    boil_volume,

    ingredients,
    steps,

    yeast,
    additives,
    full_process,
    notes,

    had_secondary,
    secondary_additions,
    secondary_notes,

    malt_warnings: maltWarnings,

    is_public: false,
    batch_id: null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
