"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";

// ---------------------------------------------------------
// 1. KANSELLER BATCH
// ---------------------------------------------------------
export async function cancelBatch(formData: FormData) {
  const { supabase } = await supabaseServer(); // riktig destructuring

  const batchId = formData.get("batch_id") as string;
  const karId = formData.get("kar_id") as string;

  if (!batchId || !karId) return;

  // Slett notater
  await supabase
    .from("batch_notes")
    .delete()
    .eq("batch_id", batchId);

  // Slett batch
  await supabase
    .from("batches")
    .delete()
    .eq("id", batchId);

  // Sett kar til ledig
  await supabase
    .from("kar")
    .update({ status: "Ledig" })
    .eq("id", karId);

  redirect(`/kar/${karId}`);
}

// ---------------------------------------------------------
// 2. OVERFØR TIL SEKUNDÆR
// ---------------------------------------------------------
export async function moveToSecondary(formData: FormData) {
  const { supabase } = await supabaseServer();

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

  redirect(`/kar/${karId}`);
}

// ---------------------------------------------------------
// 3. AVSLUTT BATCH
// ---------------------------------------------------------
export async function finishBatch(formData: FormData) {
  const { supabase } = await supabaseServer();

  const batchId = formData.get("batch_id") as string;
  const karId = formData.get("kar_id") as string;

  const fgRaw = formData.get("fg") as string;
  const notes = (formData.get("finished_notes") as string) || "";
  const saveRecipe = formData.get("save_as_recipe") === "on";

  console.log("FINISH BATCH TRIGGERED", {
    batchId,
    karId,
    fgRaw,
    notes,
    saveRecipe,
  });

  if (!batchId || !karId) return;

  const fg = parseFloat(fgRaw);

  // Hent batch
  const { data: batch } = await supabase
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (!batch) throw new Error("Batch not found");

  // ABV-formel
  const abv = (batch.og - fg) * 131.25;

  // Oppdater batch
  await supabase
    .from("batches")
    .update({
      status: "Avsluttet",
      fg,
      abv,
      finished_notes: notes,
      finished_date: new Date().toISOString(),
      save_as_recipe: saveRecipe,
    })
    .eq("id", batchId);

  // Lagre oppskrift hvis valgt
  if (saveRecipe) {
    await supabase.from("recipes").insert({
      user_id: batch.user_id,
      batch_id: batch.id,
      name: batch.name,
      og: batch.og,
      fg,
      abv,
      volume: batch.volume_l,
      ingredients: batch.oppskrift,
      method: batch.fremgangsmåte || "",
      notes,
      is_public: false,
    });
  }

  redirect(`/kar/${karId}`);
}
