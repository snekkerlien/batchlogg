"use server";

import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

export async function createBatch(formData: FormData) {
  const { supabase } = supabaseServer(); // riktig destructuring

  // Hent bruker
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Ingen session – bruker ikke innlogget.");
  }

  const userId = user.id;

  // Hent kar-ID (UUID)
  const karId = formData.get("kar") as string;

  if (!karId || typeof karId !== "string") {
    throw new Error("Kar-ID mangler eller er ugyldig.");
  }

  // Finn neste batchnummer
  const { data: last } = await supabase
    .from("batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = last ? Number(last.batchnummer) + 1 : 1;
  const formattedBatchnummer = String(nextNumber).padStart(4, "0");

  // Hent felter
  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const oppskrift = formData.get("oppskrift") as string;

  if (!name || !volume_l || !startdato || !og) {
    throw new Error("Mangler obligatoriske felter.");
  }

  // Sett inn batch (bruk UUID som aktivt_kar)
  const { error } = await supabase.from("batches").insert({
    batchnummer: formattedBatchnummer,
    aktivt_kar: karId,        // ← RIKTIG: UUID
    user_id: userId,
    name,
    volume_l,
    startdato,
    og,
    oppskrift,
    status: "Aktiv",
  });

  if (error) {
    throw new Error("Insert failed: " + error.message);
  }

  // Oppdater kar-status (bruk UUID)
  await supabase
    .from("kar")
    .update({ status: "Aktiv" })
    .eq("id", karId);         // ← RIKTIG: UUID

  // Revalidate riktig path (UUID)
  revalidatePath(`/kar/${karId}`);
}
