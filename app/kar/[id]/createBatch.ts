"use server";

import { createServerActionClient } from "../../../lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

export async function createBatch(formData: FormData) {
  const supabase = await createServerActionClient();

  // Hent bruker fra Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Ingen session – bruker ikke innlogget.");
  }

  const userId = user.id;
  const karId = formData.get("kar") as string;

  if (!karId) {
    throw new Error("Kar-ID mangler.");
  }

  // Finn siste batchnummer
  const { data: last } = await supabase
    .from("Batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = last ? Number(last.batchnummer) + 1 : 1;
  const formattedBatchnummer = String(nextNumber).padStart(4, "0");

  // Hent felter fra formData
  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const kode = formData.get("kode") as string;
  const oppskrift = formData.get("oppskrift") as string;

  if (!name || !volume_l || !startdato || !og || !kode) {
    throw new Error("Mangler obligatoriske felter.");
  }

  // Sett inn batch
  const { error } = await supabase.from("Batches").insert({
    batchnummer: formattedBatchnummer,
    aktivt_kar: karId,
    user_id: userId,
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

  // Revalidate KarPage
  revalidatePath(`/kar/${karId}`);

  return { kar: karId };
}
