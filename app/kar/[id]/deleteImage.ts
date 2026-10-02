"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function deleteImageServer(noteId: string, karId: string) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data: note, error: noteError } = await supabase
    .from("batch_notes")
    .select("id, batch_id, image_url")
    .eq("id", noteId)
    .maybeSingle();

  if (noteError) {
    throw new Error(`Could not verify image ownership: ${noteError.message}`);
  }

  if (!note || !note.image_url) {
    throw new Error("Image not found or access denied");
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
    throw new Error("Image not found or access denied");
  }

  const storageUrl = new URL(note.image_url);
  const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const storagePrefix = "/storage/v1/object/public/batch-images/";

  if (
    storageUrl.origin !== projectUrl.origin ||
    !storageUrl.pathname.startsWith(storagePrefix)
  ) {
    throw new Error("Image URL is not a batch image in this project");
  }

  let path: string;
  try {
    path = decodeURIComponent(storageUrl.pathname.slice(storagePrefix.length));
  } catch {
    throw new Error("Image storage path is invalid");
  }

  const pathParts = path.split("/");
  if (
    !path.startsWith(`${batch.id}/`) ||
    pathParts.some((part) => part === "." || part === ".." || part.includes("\\"))
  ) {
    throw new Error("Image storage path is invalid");
  }

  const { error: storageError } = await serviceRole.storage
    .from("batch-images")
    .remove([path]);

  if (storageError) {
    console.error("Storage delete error:", storageError);
    throw new Error("Could not remove image from storage");
  }

  // Slett notatet fra databasen
  const { error: dbError } = await serviceRole
    .from("batch_notes")
    .delete()
    .eq("id", note.id)
    .eq("batch_id", batch.id);

  if (dbError) {
    console.error("DB delete error:", dbError);
    throw new Error("Could not remove image from database");
  }

  revalidatePath(`/kar/${karId}`);
}
