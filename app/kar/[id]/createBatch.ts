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
  const { data: existing } = await supabase
    .from("Batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1);

  const nextBatchNumber =
    existing && existing.length > 0 ? existing[0].batchnummer + 1 : 1;

  const formattedBatchNumber = String(nextBatchNumber).padStart(4, "0");

  // 2. Hent verdier fra skjemaet (MATCHER page.tsx)
  const aktivt_kar = Number(formData.get("kar"));
  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const kode = formData.get("kode") as string;
  const oppskrift = formData.get("oppskrift") as string;

  // 3. Opprett batch
  const { error } = await supabase.from("Batches").insert([
    {
      aktivt_kar,
      name,
      volume_l,
      startdato,
      og,
      kode,
      oppskrift,
      batchnummer: formattedBatchNumber,
      status: "Aktiv",
      created_at: new Date().toISOString()
    }
  ]);

  if (error) {
    console.error("Feil ved oppretting av batch:", error);
    return; // Ikke throw → Next.js krasjer ikke
  }
}
