"use server";

export const runtime = "nodejs";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function createBatch(formData: FormData) {
  // Logg for debugging
  console.log("createBatch formData keys:", Array.from(formData.keys()));

  const kar = Number(formData.get("kar"));
  const name = String(formData.get("name"));
  const volume_l = Number(formData.get("volume_l"));
  const startdato = String(formData.get("startdato"));
  const og = Number(formData.get("og"));
  const kode = String(formData.get("kode"));
  const oppskrift = String(formData.get("oppskrift") ?? "");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from("Batches").insert({
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
    console.error("Feil ved oppretting av batch:", error);
    throw new Error("Kunne ikke opprette batch");
  }

  // 🔥 Viktig: Oppdater cache for denne siden
  revalidatePath(`/kar/${kar}`);

  // 🔥 Returner karId slik at client-komponenten kan gjøre router.push()
  return { kar };
}
