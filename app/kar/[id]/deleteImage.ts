"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function deleteImageServer(noteId: string, imageUrl: string, karId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Konverter URL → storage path
  const path = imageUrl.split("/").slice(7).join("/");

  // Slett fra storage
  const { error: storageError } = await supabase
    .storage
    .from("batch-images")
    .remove([path]);

  if (storageError) {
    console.error("Storage delete error:", storageError);
    throw new Error("Could not remove image from storage");
  }

  // Slett notatet fra databasen
  const { error: dbError } = await supabase
    .from("batch_notes")
    .delete()
    .eq("id", noteId);

  if (dbError) {
    console.error("DB delete error:", dbError);
    throw new Error("Could not remove image from database");
  }

  revalidatePath(`/kar/${karId}`);
}
