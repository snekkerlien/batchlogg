"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export async function deleteBatch(formData: FormData) {
  const batchId = Number(formData.get("batchId"));
  const kodeInput = formData.get("kode") as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Hent batchen
  const { data: batch } = await supabase
    .from("Batches")
    .select("kode, aktivt_kar")
    .eq("id", batchId)
    .single();

  if (!batch) {
    throw new Error("Batch ikke funnet");
  }

  // Sjekk kode
  if (batch.kode !== kodeInput) {
    throw new Error("Feil kode");
  }

  // Slett batch
  await supabase.from("Batches").delete().eq("id", batchId);

  // Send bruker tilbake til riktig kar-side
  redirect(`/kar/${batch.aktivt_kar}`);
}
