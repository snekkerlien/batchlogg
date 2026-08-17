"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export async function createBatch(formData: FormData) {
  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const oppskrift = formData.get("oppskrift") as string;
  const kar = Number(formData.get("kar"));
  const kode = formData.get("kode") as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from("Batches").insert({
    name,
    volume_l,
    startdato,
    og,
    oppskrift,
    aktivt_kar: kar,
    status: "Aktiv",
    kode,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/kar/${kar}`);
}
