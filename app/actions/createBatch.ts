"use server";

import { supabase } from "@/lib/supabaseClient";

export async function createBatch(formData: FormData) {
  const name = formData.get("name") as string;
  const volume = Number(formData.get("volume"));
  const kar = Number(formData.get("kar"));
  const status = formData.get("status") as string;

  const { data: existing } = await supabase
    .from("batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1);

  const nextBatchNumber =
    existing && existing.length > 0 ? existing[0].batchnummer + 1 : 1;

  const formattedBatchNumber = String(nextBatchNumber).padStart(4, "0");

  const { error } = await supabase.from("batches").insert([
    {
      name,
      volume_l: volume,
      kar,
      status,
      batchnummer: formattedBatchNumber,
    },
  ]);

  if (error) {
    console.error(error);
  }
}
