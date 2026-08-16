"use server";

import { supabase } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";

export async function createBatch(formData: FormData) {
  const batchnavn = formData.get("batchnavn") as string;
  const startdato = formData.get("startdato") as string;
  const aktivt_kar = Number(formData.get("kar"));
  const status = formData.get("status") as string;
  const batchstorrelse = Number(formData.get("batchstorrelse"));
  const og = Number(formData.get("og"));
  const fg = Number(formData.get("fg"));
  const oppskrift = formData.get("oppskrift") as string;

  // Finn neste batchnummer
  const { data: existing } = await supabase
    .from("batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1);

  const nextBatchNumber = existing && existing.length > 0
    ? existing[0].batchnummer + 1
    : 1;

  // Sett inn ny batch
  const { error } = await supabase.from("batches").insert({
    batchnavn,
    startdato,
    aktivt_kar,
    status,
    batchstorrelse,
    og,
    fg,
    oppskrift,
    batchnummer: nextBatchNumber,
  });

  if (error) {
    console.error("Feil ved oppretting av batch:", error);
    throw new Error("Kunne ikke opprette batch");
  }

  // Send bruker tilbake til riktig kar-side
  redirect(`/kar/${aktivt_kar}`);
}
