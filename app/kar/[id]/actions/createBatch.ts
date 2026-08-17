"use server";

import { createClient } from "@supabase/supabase-js";

export async function createBatch(formData: FormData) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, opts) => fetch(url, { ...opts, cache: "no-store" })
      }
    }
  );

  // 1. Finn høyeste batchnummer
  const { data: existing, error: fetchError } = await supabase
    .from("Batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error("Feil ved henting av batchnummer:", fetchError);
    throw new Error("Kunne ikke hente eksisterende batchnummer");
  }

  // 2. Generer neste nummer
  const nextBatchNumber =
    existing && existing.length > 0 ? existing[0].batchnummer + 1 : 1;

  // 3. Formater som 4-sifret nummer
  const formattedBatchNumber = String(nextBatchNumber).padStart(4, "0");

  // 4. Hent verdier fra formData
  const navn = formData.get("navn") as string;
  const beskrivelse = formData.get("beskrivelse") as string;
  const aktivt_kar = Number(formData.get("aktivt_kar"));

  // 5. Opprett batch
  const { data, error } = await supabase.from("Batches").insert([
    {
      navn,
      beskrivelse,
      aktivt_kar,
      batchnummer: formattedBatchNumber,
      status: "Aktiv",
      created_at: new Date().toISOString()
    }
  ]);

  if (error) {
    console.error("Feil ved oppretting av batch:", error);
    throw new Error("Kunne ikke opprette batch");
  }
}
