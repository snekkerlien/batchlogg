"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export async function deleteBatch(formData: FormData) {
  const batchnummer = Number(formData.get("batchnummer"));
  const kode = String(formData.get("kode"));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Hent batch for å sjekke kode
  const { data: batch } = await supabase
    .from("Batches")
    .select("*")
    .eq("batchnummer", batchnummer)
    .maybeSingle();

  if (!batch) {
    throw new Error("Batch finnes ikke");
  }

  if (batch.kode !== kode) {
    throw new Error("Feil kode");
  }

  // Slett batch
  await supabase
    .from("Batches")
    .delete()
    .eq("batchnummer", batchnummer);

  redirect(`/kar/${batch.aktivt_kar}`);
}
