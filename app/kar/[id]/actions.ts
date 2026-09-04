"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------
// 0. START NY BATCH
// ---------------------------------------------------------
export async function createBatch(formData: FormData) {
  const { supabase } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Ingen session – bruker ikke innlogget.");

  const userId = user.id;
  const karId = formData.get("kar") as string;

  if (!karId) throw new Error("Kar-ID mangler.");

  const { data: last } = await supabase
    .from("batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = last ? Number(last.batchnummer) + 1 : 1;
  const formattedBatchnummer = String(nextNumber).padStart(4, "0");

  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const oppskrift = formData.get("oppskrift") as string;

  if (!name || !volume_l || !startdato || !og) {
    throw new Error("Mangler obligatoriske felter.");
  }

  // ⭐ Insert batch and return the created row
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
      oppskrift,
      status: "Aktiv",
    })
    .select()
    .single();

  if (error) throw new Error("Insert failed: " + error.message);

  // ⭐ NEW: Register OG as first SG reading
  await supabase.from("sg_readings").insert({
    batch_id: batch.id,
    sg: og,
    created_at: startdato, // same date as batch start
  });

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
  const notes = (formData.get("finished_notes") as string) || "";
  const saveRecipe = formData.get("save_as_recipe") === "on";

  if (!batchId || !karId) return;

  const fg = parseFloat(fgRaw);

  const { data: batch } = await supabase
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (!batch) throw new Error("Batch not found");

  const abv = (batch.og - fg) * 131.25;

  const { data: batchNotes } = await supabase
    .from("batch_notes")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

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

  await supabase.from("kar").update({ status: "Ledig" }).eq("id", karId);

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
