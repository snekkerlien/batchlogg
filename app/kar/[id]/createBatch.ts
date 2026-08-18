"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function createBatch(formData: FormData) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!   // ← FIX
  );

  // 1. Finn siste batchnummer
  const { data: last } = await supabase
    .from("Batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Generer neste nummer
  const nextNumber = last ? Number(last.batchnummer) + 1 : 1;
  const formattedBatchnummer = String(nextNumber).padStart(4, "0");

  // 3. Hent felter fra formData
  const kar = Number(formData.get("kar"));
  const name = formData.get("name");
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato");
  const og = Number(formData.get("og"));
  const kode = formData.get("kode");
  const oppskrift = formData.get("oppskrift");

  // 4. Sett inn ny batch
  const { error } = await supabase.from("Batches").insert({
    batchnummer: formattedBatchnummer,
    aktivt_kar: kar,
    name,
    volume_l,
    startdato,
    og,
    kode,
    oppskrift,
    status: "Aktiv",
  });

  if (error) {
    throw new Error("Insert failed: " + error.message);
  }

  // 5. Oppdater siden
  revalidatePath(`/kar/${kar}`);

  return { kar };
}
