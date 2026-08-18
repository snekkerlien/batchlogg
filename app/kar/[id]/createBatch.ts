"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function createBatch(formData: FormData) {
  // Klient som kan hente session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Hent session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Ingen session – bruker ikke innlogget.");
  }

  const userId = session.user.id;

  // Finn siste batchnummer
  const { data: last } = await supabase
    .from("Batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = last ? Number(last.batchnummer) + 1 : 1;
  const formattedBatchnummer = String(nextNumber).padStart(4, "0");

  // Hent felter
  const kar = Number(formData.get("kar"));
  const name = formData.get("name");
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato");
  const og = Number(formData.get("og"));
  const kode = formData.get("kode");
  const oppskrift = formData.get("oppskrift");

  // Sett inn batch MED user_id
  const { error } = await supabase.from("Batches").insert({
    batchnummer: formattedBatchnummer,
    aktivt_kar: kar,
    user_id: userId,            // ← FIX
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

  revalidatePath(`/kar/${kar}`);

  return { kar };
}
