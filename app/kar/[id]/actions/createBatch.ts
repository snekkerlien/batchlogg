"use server";

import { createClient } from "@supabase/supabase-js";

export async function createBatch(formData: FormData) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const kar = Number(formData.get("kar"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const fg = Number(formData.get("fg"));
  const oppskrift = formData.get("oppskrift") as string;
  const status = "Aktiv";

  // Finn neste batchnummer
  const { data: existing } = await supabase
    .from("Batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1);

  const nextBatchNumber =
    existing && existing.length > 0 ? Number(existing[0].batchnummer) + 1 : 1;

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
    console.error("Feil ved oppretting av batch:", error.message);
  }
}
