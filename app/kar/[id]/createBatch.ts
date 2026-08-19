"use server";

import { createServerClient } from "../../../lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

export async function createBatch(formData: FormData) {
  const supabase = await createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Ingen session – bruker ikke innlogget.");
  }

  const userId = session.user.id;
  const karId = formData.get("kar") as string;

  const { data: last } = await supabase
    .from("Batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = last ? Number(last.batchnummer) + 1 : 1;
  const formattedBatchnummer = String(nextNumber).padStart(4, "0");

  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const kode = formData.get("kode") as string;
  const oppskrift = formData.get("oppskrift") as string;

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

  revalidatePath(`/kar/${karId}`);

  return { kar: karId };
}
