"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { uploadNoteImage } from "@/lib/supabase/uploadNoteImage";
import { revalidatePath } from "next/cache";

export async function addNote(formData: FormData) {
  console.log("=== addNote START ===");

  const { supabase } = await supabaseServer();

  const batchId = formData.get("batch_id")?.toString();
  const karId = formData.get("kar_id")?.toString();
  const noteRaw = formData.get("note")?.toString() ?? "";
  const imageFile = formData.get("image") as File | null;

  const note = noteRaw.trim(); // ⭐ ren tekst

  console.log("[addNote] Batch ID:", batchId);
  console.log("[addNote] Note:", note);
  console.log("[addNote] ImageFile:", imageFile);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("[addNote] User:", user);
  console.log("[addNote] UserError:", userError);

  if (!user) throw new Error("Authentication required");
  if (!batchId || !karId) throw new Error("Batch and vessel IDs are required.");

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("id, aktivt_kar")
    .eq("id", batchId)
    .eq("aktivt_kar", karId)
    .maybeSingle();
  if (batchError) throw new Error(`Could not verify batch access: ${batchError.message}`);
  if (!batch) throw new Error("Batch not found or access denied.");

  // ⭐ NYTT: Tillat bilde uten tekst, men stopp hvis begge er tomme
  if (!note && !imageFile) {
    console.log("[addNote] Ingen tekst eller bilde → avbryter");
    return;
  }

  let imageUrl: string | null = null;

  // Last opp bilde hvis det finnes
  if (imageFile && imageFile.size > 0) {
    try {
      imageUrl = await uploadNoteImage(imageFile, batchId);
      console.log("[addNote] Image uploaded:", imageUrl);
    } catch (err) {
      console.error("[addNote] Image upload failed", err);
      throw err;
    }
  }

  const { error: insertError } = await supabase
    .from("batch_notes")
    .insert({
      batch_id: batchId,
      user_id: user.id,
      note: note || null,          // ⭐ tekst eller null
      image_url: imageUrl,         // ⭐ bilde eller null
      note_type: imageUrl ? "image" : "text",
    });

  console.log("[addNote] InsertError:", insertError);

  if (insertError) throw new Error(`Could not save note: ${insertError.message}`);
  revalidatePath(`/kar/${karId}`);

  console.log("=== addNote END ===");
}
