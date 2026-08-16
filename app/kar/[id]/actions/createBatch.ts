"use server";

import { supabase } from "@/lib/supabaseClient";

export async function createBatch(formData: FormData) {
  const kar = Number(formData.get("kar"));
  const name = formData.get("name") as string;
  const volume = Number(formData.get("volume"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const fg = Number(formData.get("fg"));
  const oppskrift = formData.get("oppskrift") as string;

  await supabase.from("batches").insert({
    aktivt_kar: kar,
    name,
    volume_l: volume,
    startdato,
    og,
    fg,
    oppskrift,
    status: "Aktiv",
  });
}
