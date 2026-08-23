"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function deleteNoteServer(noteId: string, karId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("batch_notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    console.error("NOTE DELETE ERROR:", error);
    throw new Error("Could not delete your note");
  }

  revalidatePath(`/kar/${karId}`);
}
