"use server";

import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

async function debug(tag: string, data: any) {
  try {
    const { supabase } = supabaseServer();
    await supabase.from("debug_logs").insert({
      tag,
      data
    });
  } catch (e) {
    // ignore debug failures
  }
}

export async function createBatch(formData: FormData) {
  const { supabase } = supabaseServer();

  await debug("createBatch_start", {
    formData: {
      name: formData.get("name"),
      volume_l: formData.get("volume_l"),
      startdato: formData.get("startdato"),
      og: formData.get("og"),
      oppskrift: formData.get("oppskrift"),
      type: formData.get("type"),
      kar: formData.get("kar")
    }
  });

  async function debug(tag: string, data: any) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/debug_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({
        tag,
        data,
      }),
    });
  } catch (e) {
    // ignore
  }
}


  // Fetch user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await debug("createBatch_no_user", {});
    throw new Error("No session – user is not logged in.");
  }

  const userId = user.id;

  // Fetch vessel ID (UUID)
  const karId = formData.get("kar") as string;

  if (!karId || typeof karId !== "string") {
    await debug("createBatch_invalid_kar", { karId });
    throw new Error("Fermentation vessel ID is missing or invalid.");
  }

  // Find next batch number
  const { data: last } = await supabase
    .from("batches")
    .select("batchnummer_int")
    .eq("user_id", userId)
    .order("batchnummer_int", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextInt = last ? last.batchnummer_int + 1 : 1;
  const nextFormatted = String(nextInt).padStart(4, "0");

  await debug("createBatch_next_batch_number", {
    last,
    nextInt,
    nextFormatted
  });

  // Fetch fields
  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const oppskrift = formData.get("oppskrift") as string;
  const type = formData.get("type") as string;

  await debug("createBatch_fields_parsed", {
    name,
    volume_l,
    startdato,
    og,
    oppskrift,
    type
  });

  if (!name || !volume_l || !startdato || !og) {
    await debug("createBatch_missing_fields", {
      name,
      volume_l,
      startdato,
      og
    });
    throw new Error("Missing required fields.");
  }

  // Insert batch
  const { data: batch, error } = await supabase
    .from("batches")
    .insert({
      batchnummer_int: nextInt,
      batchnummer: nextFormatted,
      aktivt_kar: karId,
      user_id: userId,
      name,
      volume_l,
      startdato,
      og,
      oppskrift,
      type,
      status: "Aktiv",
    })
    .select()
    .single();

  if (error) {
    await debug("createBatch_insert_error", { error });
    throw new Error("Insert failed: " + error.message);
  }

  await debug("createBatch_insert_success", { batch });

  // Register OG as first SG reading
  const sgInsert = await supabase.from("sg_readings").insert({
    batch_id: batch.id,
    sg: og,
    created_at: startdato,
  });

  await debug("createBatch_sg_insert", sgInsert);

  // ⭐ Generate nutrient schedule
  await debug("createBatch_schedule_call", {
    schedulePayload: {
      id: batch.id,
      user_id: batch.user_id,
      vessel_number: batch.aktivt_kar,
      volume_liter: Number(batch.volume_l),
      og: batch.og,
      type: batch.type,
    }
  });


  await debug("createBatch_schedule_done", { batch_id: batch.id });

  // Update vessel status
  const vesselUpdate = await supabase
    .from("kar")
    .update({ status: "Aktiv" })
    .eq("id", karId);

  await debug("createBatch_vessel_update", vesselUpdate);

  // Revalidate correct path
  await debug("createBatch_revalidate", { path: `/kar/${karId}` });
  revalidatePath(`/kar/${karId}`);

  await debug("createBatch_complete", { batch_id: batch.id });
}
