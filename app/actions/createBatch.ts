export const runtime = "nodejs";

"use server";

async function debug(tag: string, data: any) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/debug_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({ tag, data }),
    });
  } catch (e) {
    // ignore
  }
}

import { supabaseServer } from "../../lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";
export async function createBatch(formData: FormData) {
  const { supabase } = supabaseServer();

  console.log("🟦 createBatch_start");

  // Fetch user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("🟥 No user session");
    throw new Error("No session – user is not logged in.");
  }

  const userId = user.id;

  // Fetch vessel ID (UUID)
  const karId = formData.get("kar") as string;

  if (!karId || typeof karId !== "string") {
    console.log("🟥 Invalid karId:", karId);
    throw new Error("Fermentation vessel ID is missing or invalid.");
  }

  const { data: vessel, error: vesselError } = await supabase
    .from("kar")
    .select("id")
    .eq("id", karId)
    .eq("user_id", userId)
    .maybeSingle();

  if (vesselError || !vessel) {
    throw new Error("Fermentation vessel not found or not owned by this user.");
  }

  const { data: activeBatch, error: activeBatchError } = await supabase
    .from("batches")
    .select("id")
    .eq("aktivt_kar", karId)
    .in("status", ["Aktiv", "Sekundær", "secondary"])
    .maybeSingle();

  if (activeBatchError) {
    throw new Error(`Could not verify vessel availability: ${activeBatchError.message}`);
  }

  if (activeBatch) {
    throw new Error("This fermentation vessel already contains an active batch.");
  }

  // Find next batch number, counted from 1 per user
  const { data: userBatches } = await supabase
    .from("batches")
    .select("batchnummer")
    .eq("user_id", userId);

  const nextInt =
    Math.max(0, ...(userBatches ?? []).map((b) => Number(b.batchnummer) || 0)) + 1;
  const formattedBatchnummer = String(nextInt).padStart(4, "0");

  console.log("🟩 nextInt:", nextInt);

  // Fetch fields
  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const oppskrift = formData.get("oppskrift") as string;
  const type = formData.get("type") as string;

  // ⭐ TERMINAL LOG: payload som faktisk sendes
  const payload = {
    batchnummer_int: nextInt,
    batchnummer: formattedBatchnummer,
    aktivt_kar: karId,
    user_id: userId,
    name,
    volume_l,
    startdato,
    og,
    oppskrift,
    type,
    status: "Aktiv",
  };

  console.log("🟨 INSERT PAYLOAD:", payload);

  // Insert batch
  const { data: batch, error } = await supabase
    .from("batches")
    .insert(payload)
    .select()
    .single();

  console.log("🟪 INSERT RESULT:", { batch, error });

  if (error) {
    console.log("🟥 Insert error:", error);
    throw new Error("Insert failed: " + error.message);
  }

  // Register OG as first SG reading
  const sgInsert = await supabase.from("sg_readings").insert({
    batch_id: batch.id,
    sg: og,
    created_at: startdato,
  });

  console.log("🟫 SG insert:", sgInsert);

  // Update vessel status
  const vesselUpdate = await supabase
    .from("kar")
    .update({ status: "Aktiv" })
    .eq("id", karId);

  console.log("🟦 Vessel update:", vesselUpdate);

  // Revalidate correct path
  revalidatePath(`/kar/${karId}`);

  console.log("🟩 createBatch_complete:", batch.id);
}
