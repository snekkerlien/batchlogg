"use server";

import { supabase } from "@/lib/supabaseClient";

export async function createBatch(formData: FormData) {
  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const kar = Number(formData.get("kar"));
  const status = "Aktiv";
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const fg = Number(formData.get("fg"));
  const oppskrift = formData.get("oppskrift") as string;

  // Finn neste batchnummer
  const { data: existing } = await supabase
    .from("Batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1);

  const nextBatchNumber =
    existing && existing.length > 0 ? existing[0].batchnummer + 1 : 1;

  const formattedBatchNumber = String(nextBatchNumber).padStart(4, "0");

  // Lagre batch
  const { error } = await supabase.from("Batches").insert([
    {
      name,
      volume_l,
      aktivt_kar: kar,
      status,
      startdato,
      og,
      fg,
      oppskrift,
      batchnummer: formattedBatchNumber,
    },
  ]);

  if (error) {
    console.error(error);
  }

  return;
}
