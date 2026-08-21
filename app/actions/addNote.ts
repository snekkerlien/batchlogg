"use server";

import { supabaseServer } from "../../lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

export async function addNote(batchId: string, note: string, imageUrl?: string) {
  console.log("=== addNote START ===");

  const { supabase, token } = supabaseServer();

  console.log("[addNote] Token:", token);

  if (!token) {
    console.log("[addNote] Ingen token → avbryter");
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  console.log("[addNote] User:", user);
  console.log("[addNote] UserError:", userError);

  if (!user) return;

  await supabase.from("batch_notes").insert({
    batch_id: batchId,
    user_id: user.id,
    note,
    image_url: imageUrl || null,
    note_type: imageUrl ? "image" : "text",
  });

  console.log("[addNote] Insert OK");

  revalidatePath(`/profiles/${user.id}/kar`);

  console.log("=== addNote END ===");
}
