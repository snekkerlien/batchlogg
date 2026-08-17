"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function deleteBatch(formData: FormData) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // batchnummer må alltid være tekst med leading zeros
  const rawBatchnummer = formData.get("batchnummer");
  const batchnummer = String(rawBatchnummer).padStart(4, "0");

  const kode = formData.get("kode");

  // Slett riktig rad
  const { error } = await supabase
    .from("Batches")
    .delete()
    .eq("batchnummer", batchnummer)
    .eq("kode", kode);

  if (error) {
    throw new Error("Delete failed: " + error.message);
  }

  // Oppdater siden
  revalidatePath("/");

  return { ok: true };
}
