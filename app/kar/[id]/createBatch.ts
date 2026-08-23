"use server";

import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

export async function createBatch(formData: FormData) {
  const { supabase } = supabaseServer(); // correct destructuring

  // Fetch user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No session – user is not logged in.");
  }

  const userId = user.id;

  // Fetch vessel ID (UUID)
  const karId = formData.get("kar") as string;

  if (!karId || typeof karId !== "string") {
    throw new Error("Fermentation vessel ID is missing or invalid.");
  }

  // Find next batch number
  const { data: last } = await supabase
    .from("batches")
    .select("batchnummer")
    .order("batchnummer", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = last ? Number(last.batchnummer) + 1 : 1;
  const formattedBatchnummer = String(nextNumber).padStart(4, "0");

  // Fetch fields
  const name = formData.get("name") as string;
  const volume_l = Number(formData.get("volume_l"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const oppskrift = formData.get("oppskrift") as string;

  if (!name || !volume_l || !startdato || !og) {
    throw new Error("Missing required fields.");
  }

  // Insert batch (UUID as aktivt_kar)
  const { error } = await supabase.from("batches").insert({
    batchnummer: formattedBatchnummer,
    aktivt_kar: karId,        // correct: UUID
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

  // Update vessel status (UUID)
  await supabase
    .from("kar")
    .update({ status: "Aktiv" })
    .eq("id", karId);         // correct: UUID

  // Revalidate correct path (UUID)
  revalidatePath(`/kar/${karId}`);
}
