"use server";

import { supabaseServer } from "../../lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

export async function addNote(batchId: string, note: string, imageUrl?: string) {
  const supabase = supabaseServer;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("batch_notes").insert({
    batch_id: batchId,
    user_id: user.id,
    note,
    image_url: imageUrl || null,
    note_type: imageUrl ? "image" : "text",
  });

  revalidatePath(`/profiles/${user.id}/kar`);
}
