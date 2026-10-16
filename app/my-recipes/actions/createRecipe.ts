"use server";

import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";
import {
  calcDryHopIBU,
  calcEBC,
  calcIBU,
} from "@/lib/brewing/beerCalculators";

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
  const beerSubtype = formData.get("beer_subtype") as string | null;
  const kitUrl = formData.get("kit_url") as string | null;

  if (
    type === "Beer" &&
    !["all_grain", "fresh_wort_kit", "malt_extract_kit"].includes(beerSubtype ?? "")
  ) {
    return { success: false, error: "Choose a beer recipe style." };
  }
  if (type === "Beer" && beerSubtype !== "all_grain" && kitUrl?.trim()) {
    try {
      const parsedKitUrl = new URL(kitUrl.trim());
      if (parsedKitUrl.protocol !== "http:" && parsedKitUrl.protocol !== "https:") {
        return { success: false, error: "Kit link must use http or https." };
      }
    } catch {
      return { success: false, error: "Enter a valid kit link." };
    }
  }

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
  if (
    type === "Beer" &&
    beerSubtype !== "all_grain" &&
    (!name?.trim() ||
      !yeast?.trim() ||
      !ogRaw ||
      !Number.isFinite(og) ||
      !volumeRaw ||
      !Number.isFinite(volume) ||
      Number(volume) <= 0)
  ) {
    return {
      success: false,
      error: "Kit name, volume, OG, and yeast are required for kit recipes.",
    };
  }

  // Mead
  const honey_type = formData.get("honey_type") as string;
  const honey_amount = formData.get("honey_amount") as string;
  const base_liquid = formData.get("base_liquid") as string;
  const base_liquid_amount = formData.get("base_liquid_amount") as string;

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

  const hops = hopsRaw.map((h: any) => ({
  ...h,
  alpha: h.alpha
    ? Number(String(h.alpha).replace(",", "."))
    : 0,
  year: h.year ? Number(h.year) : null,
}));

  if (
    ((type === "Beer" && beerSubtype === "all_grain") || type === "Braggot") &&
    hopsRaw.some(
      (hop: any) =>
        [hop.name, hop.amount, hop.alpha, hop.year].some(
          (value) => value != null && String(value).trim() !== ""
        ) &&
        (
          hop.time == null ||
          String(hop.time).trim() === "" ||
          (hop.addition_type === "whirlpool" &&
            (!Number.isFinite(Number(hop.temperature)) ||
              Number(hop.temperature) < 0 ||
              Number(hop.temperature) > 100))
        )
    )
  ) {
    return {
      success: false,
      error: "Enter a time for every hop addition and a whirlpool temperature between 0 and 100°C.",
    };
  }





  // ⭐ NEW: Dry hops
  const dry_hops_json = formData.get("dry_hops_json") as string;
  const dry_hops = dry_hops_json ? JSON.parse(dry_hops_json) : null;

  const boil_time = formData.get("boil_time") as string;
  const boilVolumeRaw = formData.get("boil_volume_l") as string;
  const boil_volume = boilVolumeRaw ? parseFloat(boilVolumeRaw) : null;

  // ⭐ Automatic IBU/EBC for beer/braggot
  const ibuBoil =
  (type === "Beer" || type === "Braggot") && og && volume
    ? calcIBU(hops || [], og, volume, boil_volume ?? volume)
    : 0

  const ibuDry =
    (type === "Beer" || type === "Braggot")
      ? calcDryHopIBU(dry_hops || [], volume ?? 0)
      : 0;

  const ibu = ibuBoil + ibuDry;

  const ebcResult =
    (type === "Beer" || type === "Braggot") && volume
      ? calcEBC(malts || [], volume)
      : { ebc: 0, warnings: [] };

  const ebc = ebcResult.ebc;

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
  const otherIngredients = ingredients_json ? JSON.parse(ingredients_json) : null;
  const ingredients =
    type === "Beer"
      ? {
          beer_subtype: beerSubtype,
          kit_url:
            beerSubtype === "all_grain" || !kitUrl?.trim()
              ? null
              : new URL(kitUrl.trim()).toString(),
        }
      : otherIngredients;

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
    base_liquid,
    base_liquid_amount: base_liquid_amount ? parseFloat(base_liquid_amount) : null,
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
