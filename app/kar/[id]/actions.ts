"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MALTS_DB, MALT_ALIASES } from "@/app/recipes/actions/data";



// ---------------------------------------------------------
// 0. START NY BATCH
// ---------------------------------------------------------

type Fruit = { name: string; amount: string; unit: string };
type Malt = { name: string; amount: string; unit: string };
type Hop = { name: string; amount: string; unit: string; time: string; alpha: string; year: string; };
type DryHop = { name: string; amount: string; contact: string; alpha: string; year: string; };

type Ingredient = { name: string; amount: string; unit: string };

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


function calcIBU(hops: any[], og: number, volumeL: number) {
  if (!hops || hops.length === 0) return 0;

  const bigness = 1.65 * Math.pow(0.000125, og - 1.0);
  let ibu = 0;

  for (const hop of hops) {
    const aa = Number(hop.alpha) || 0;   // brukerens alfasyre

    const boil = hop.time ? Number(hop.time) : 60;
    const boilFactor = (1 - Math.exp(-0.04 * boil)) / 4.15;
    const utilization = bigness * boilFactor;

    ibu += (Number(hop.amount) * 1000 * aa * utilization) / volumeL;
  }

  return ibu;
}


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


export async function createBatch(formData: FormData) {
  const { supabase } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Ingen session – bruker ikke innlogget.");

  const userId = user.id;
  const karId = formData.get("kar") as string;

  if (!karId) throw new Error("Kar-ID mangler.");

  // Finn neste batchnummer
  const { data: last } = await supabase
    .from("batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = last ? Number(last.batchnummer) + 1 : 1;
  const formattedBatchnummer = String(nextNumber).padStart(4, "0");

  // Base fields
  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const type = formData.get("type") as string;

  if (!name || !volume_l || !startdato || !og) {
    throw new Error("Mangler obligatoriske felter.");
  }

  // Mead fields
  const honey_type = (formData.get("honey_type") as string) || "";
  const honey_amount = (formData.get("honey_amount") as string) || "";
  const yeast = (formData.get("yeast") as string) || "";

  const fruits_json = formData.get("fruits_json") as string;
  const fruits: Fruit[] = fruits_json ? JSON.parse(fruits_json) : [];

  // Cider fields
  const juice_type = (formData.get("juice_type") as string) || "";
  const sugar_amount = (formData.get("sugar_amount") as string) || "";

  // Braggot + Beer fields
  const malts_json = formData.get("malts_json") as string;
  const malts: Malt[] = malts_json ? JSON.parse(malts_json) : [];

  const hops_json = formData.get("hops_json") as string;
  const hops: Hop[] = hops_json ? JSON.parse(hops_json) : [];
  const dry_hops_json = formData.get("dry_hops_json") as string;
  const dryHops: DryHop[] = dry_hops_json ? JSON.parse(dry_hops_json) : [];


  // Resolve malt names → real malt names
const resolvedMalts = malts.map(m => {
  const alias = MALT_ALIASES[m.name.toLowerCase()];
  const realName = alias || m.name;

  const dbEntry = MALTS_DB.find(x => x.name.toLowerCase() === realName.toLowerCase());

  return {
    ...m,
    lovibond: dbEntry?.lovibond ?? 0
  };
});

// Resolve hop names → real hop names
const resolvedHops = hops.map(h => ({
  ...h,
  alpha: Number(h.alpha) || 0,   // brukerens alfasyre
  year: Number(h.year) || null, // brukerens årstall
}));

const resolvedDryHops = dryHops.map(h => ({
  ...h,
  alpha: Number(h.alpha) || 0,
  year: Number(h.year) || null,
}));





  const boil_time = (formData.get("boil_time") as string) || "";

  const boil_volume_l = Number(formData.get("boil_volume_l") ?? formData.get("volume_l"));

  // ⭐ Brewfather IBU/EBC for Beer + Braggot
let ibu = 0;
let ebc = 0;

if (type === "Beer" || type === "Braggot") {
  const ibuBoil = calcIBU(resolvedHops, og, boil_volume_l || volume_l);
  const ebcResult = calcEBC(malts, boil_volume_l || volume_l);

  ibu = ibuBoil;
  ebc = ebcResult.ebc;
}


  // Other fields
  const ingredients_json = formData.get("ingredients_json") as string;
  const ingredients: Ingredient[] = ingredients_json ? JSON.parse(ingredients_json) : [];

  const steps_json = formData.get("steps_json") as string;
  const steps: string[] = steps_json ? JSON.parse(steps_json) : [];

  // Shared fields
  const additives = (formData.get("additives") as string) || "";
  const full_process = (formData.get("full_process") as string) || "";
  const notes = (formData.get("notes") as string) || "";

  // ---------------------------------------------------------
  // Build recipe text (oppskrift)
  // ---------------------------------------------------------

  let oppskrift = "";

  // Mead
  if (type === "Mead") {
    oppskrift = `
Honey:
${honey_type} – ${honey_amount} kg

Fruits:
${fruits.map((f: Fruit) => `${f.name}: ${f.amount}${f.unit}`).join("\n")}

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
  }

  // Cider
  else if (type === "Cider") {
    oppskrift = `
Juice type:
${juice_type}

Sugar added:
${sugar_amount} kg

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
  }

  // Wine
  else if (type === "Wine") {
    oppskrift = `
Juice / Grape type:
${juice_type}

Sugar added:
${sugar_amount} kg

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
  }

  // Hard Seltzer
  else if (type === "Seltzer") {
    oppskrift = `
Sugar:
${sugar_amount} kg

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
  }

  // Braggot
  else if (type === "Braggot") {
    oppskrift = `
Malt additions:
${malts.map((m: Malt) => `${m.name}: ${m.amount}${m.unit}`).join("\n")}

Boil time:
${boil_time} min

Honey:
${honey_amount} kg

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
  }

  // Beer
else if (type === "Beer") {
  oppskrift = `
Malt additions:
${malts.map((m: Malt) => `${m.name}: ${m.amount}${m.unit}`).join("\n")}

Hop additions:
${hops
  .map((h: Hop) => `${h.name}: ${h.amount}${h.unit} @ ${h.time} min (${h.alpha}% - ${h.year})`)
  .join("\n")}

Dry hop additions:
${dryHops
  .map(h => `${h.name}: ${h.amount}g (${h.alpha}% - ${h.year}) for ${h.contact} days`)
  .join("\n")}

Total boil time:
${boil_time} min

Additives:
${additives}

Full process:
${full_process}

Notes:
${notes}
`.trim();
}

  // Other
  else if (type === "Other") {
    oppskrift = `
Ingredients:
${ingredients.map((i: Ingredient) => `${i.name}: ${i.amount}${i.unit}`).join("\n")}

Process steps:
${steps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}

Additives:
${additives}

Notes:
${notes}
`.trim();

  }

  // ---------------------------------------------------------
  // Insert batch
  // ---------------------------------------------------------

  const { data: batch, error } = await supabase
    .from("batches")
    .insert({
      batchnummer: formattedBatchnummer,
      aktivt_kar: karId,
      user_id: userId,
      name,
      volume_l,
      startdato,
      og,
      type,

      // Mead
      honey_type,
      honey_amount,
      fruits,

      // Shared
      yeast,
      additives,
      full_process,
      notes,
      oppskrift,

      // Cider / Wine / Seltzer
      juice_type,
      sugar_amount,

      // Braggot / Beer
      malts: resolvedMalts,
      hops: resolvedHops,
      dry_hops: resolvedDryHops,
      boil_time,
      boil_volume_l,
      ibu,
      ebc,
      

      // Other
      ingredients,
      steps,

      status: "Aktiv",
    })
    .select()
    .single();

  if (error) throw new Error("Insert failed: " + error.message);

  // SG reading
  await supabase.from("sg_readings").insert({
    batch_id: batch.id,
    sg: og,
    created_at: startdato,
  });

  // Update kar status
  await supabase.from("kar").update({ status: "Aktiv" }).eq("id", karId);

  revalidatePath(`/kar/${karId}`);
  redirect(`/kar/${karId}`);
}





// ---------------------------------------------------------
// 1. KANSELLER BATCH
// ---------------------------------------------------------
export async function cancelBatch(formData: FormData) {
  const { supabase } = supabaseServer();

  const batchId = formData.get("batch_id") as string;
  const karId = formData.get("kar_id") as string;

  if (!batchId || !karId) return;

  await supabase.from("batch_notes").delete().eq("batch_id", batchId);
  await supabase.from("batches").delete().eq("id", batchId);
  await supabase.from("kar").update({ status: "Ledig" }).eq("id", karId);

  redirect(`/kar/${karId}`);
}

// ---------------------------------------------------------
// 2. OVERFØR TIL SEKUNDÆR
// ---------------------------------------------------------
export async function moveToSecondary(formData: FormData) {
  const { supabase } = supabaseServer();

  const batchId = formData.get("batch_id") as string;
  const karId = formData.get("kar_id") as string;

  const additions = (formData.get("secondary_additions") as string) || "";
  const notes = (formData.get("secondary_notes") as string) || "";

  if (!batchId || !karId) return;

  await supabase
    .from("batches")
    .update({
      status: "Sekundær",
      secondary_startdate: new Date().toISOString(),
      secondary_additions: additions,
      secondary_notes: notes,
    })
    .eq("id", batchId);

  await supabase.from("kar").update({ status: "Sekundær" }).eq("id", karId);

  redirect(`/kar/${karId}`);
}

// ---------------------------------------------------------
// 3. AVSLUTT BATCH
// ---------------------------------------------------------
export async function finishBatch(formData: FormData) {
  const { supabase } = supabaseServer();

  const batchId = formData.get("batch_id") as string;
  const karId = formData.get("kar_id") as string;

  const fgRaw = formData.get("fg") as string;
  const finished_notes = (formData.get("finished_notes") as string) || "";
  const saveRecipe = formData.get("save_as_recipe") === "on";

  if (!batchId || !karId) return;

  const fg = parseFloat(fgRaw);

  // Fetch batch
  const { data: batch } = await supabase
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (!batch) throw new Error("Batch not found");

  // Calculate ABV
  const abv = (batch.og - fg) * 131.25;

  // Fetch batch notes
  const { data: batchNotes } = await supabase
    .from("batch_notes")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  // Update batch
  await supabase
    .from("batches")
    .update({
      status: "Avsluttet",
      fg,
      abv,
      finished_notes,
      finished_date: new Date().toISOString(),
      save_as_recipe: saveRecipe,
    })
    .eq("id", batchId);

  // Free vessel
  await supabase.from("kar").update({ status: "Ledig" }).eq("id", karId);

  // SAVE AS RECIPE
  if (saveRecipe) {
    await supabase.from("recipes").insert({
      user_id: batch.user_id,
      batch_id: batch.id,

      // Core
      type: batch.type,
      name: batch.name,
      og: batch.og,
      fg,
      abv,
      volume: batch.volume_l,

      // Mead
      honey_type: batch.honey_type,
      honey_amount: batch.honey_amount,
      fruits: batch.fruits,

      // Wine / Cider / Seltzer
      juice_type: batch.juice_type,
      sugar_amount: batch.sugar_amount,

      // Beer / Braggot
      malts: batch.malts,
      hops: batch.hops,
      boil_time: batch.boil_time,
      ibu: batch.ibu,
      ebc: batch.ebc,

      // Other
      ingredients: batch.ingredients,
      steps: batch.steps,

      // Shared
      yeast: batch.yeast,
      additives: batch.additives,
      full_process: batch.full_process,
      notes: batch.notes,

      // Secondary
      had_secondary: batch.secondary_startdate ? true : false,
      secondary_additions: batch.secondary_additions,
      secondary_notes: batch.secondary_notes,

      // Notes log
      notes_log: batchNotes ?? [],

      is_public: false,
    });
  }

  redirect(`/kar/${karId}`);
}


// ---------------------------------------------------------
// 4. OPPDATER AKTIV BATCH  ⭐ NY FUNKSJON
// ---------------------------------------------------------
export async function updateBatch(formData: FormData) {
  const { supabase } = supabaseServer();

  const batchId = formData.get("batch_id") as string;
  const karId = formData.get("kar_id") as string;

  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const og = Number(formData.get("og"));
  const startdato = formData.get("startdato") as string;
  const oppskrift = formData.get("oppskrift") as string;
  const secondary_additions = formData.get("secondary_additions");
  const secondary_notes = formData.get("secondary_notes");

  if (!batchId || !karId) return;

  await supabase
    .from("batches")
    .update({
      name,
      volume_l,
      og,
      startdato,
      oppskrift,
      secondary_additions,
      secondary_notes,
    })
    .eq("id", batchId);

  revalidatePath(`/kar/${karId}`);
  redirect(`/kar/${karId}`);
}
