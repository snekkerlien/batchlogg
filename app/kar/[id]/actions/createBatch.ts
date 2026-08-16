"use server";

import { createClient } from "@supabase/supabase-js";

export async function createBatch(formData: FormData) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // ← viktig
  );

  const kar = Number(formData.get("kar"));
  const name = formData.get("name") as string;
  const volume = Number(formData.get("volume"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const fg = Number(formData.get("fg"));
  const oppskrift = formData.get("oppskrift") as string;

  const { error } = await supabase.from("batches").insert({
    aktivt_kar: kar,
    name,
    volume_l: volume,
    startdato,
    og,
    fg,
    oppskrift,
    status: "Aktiv",
  });

  if (error) {
    console.error("Supabase insert error:", error);
  }
}
