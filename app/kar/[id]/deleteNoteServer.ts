"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function deleteNoteServer(noteId: string, karId: string) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data: note, error: noteError } = await supabase
    .from("batch_notes")
    .select("id, batch_id")
    .eq("id", noteId)
    .maybeSingle();

  if (noteError) {
    throw new Error(`Could not verify note ownership: ${noteError.message}`);
  }

  if (!note) {
    throw new Error("Note not found or access denied");
  }

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("id, user_id, aktivt_kar")
    .eq("id", note.batch_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (batchError) {
    throw new Error(`Could not verify batch ownership: ${batchError.message}`);
  }

  if (!batch || batch.aktivt_kar !== karId) {
    throw new Error("Note not found or access denied");
  }

  const { error: deleteError } = await serviceRole
    .from("batch_notes")
    .delete()
    .eq("id", note.id)
    .eq("batch_id", batch.id);

  if (deleteError) {
    console.error("NOTE DELETE ERROR:", deleteError);
    throw new Error(`Could not delete note: ${deleteError.message}`);
  }

  revalidatePath(`/kar/${karId}`);
}
