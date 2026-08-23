"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { uploadNoteImage } from "@/lib/supabase/uploadNoteImage";
import { revalidatePath } from "next/cache";

export async function addNote(formData: FormData) {
  console.log("=== addNote START ===");

  const { supabase } = await supabaseServer();

  const batchId = formData.get("batch_id")?.toString();
  const note = formData.get("note")?.toString() ?? "";
  const imageFile = formData.get("image") as File | null;

  console.log("[addNote] Batch ID:", batchId);
  console.log("[addNote] Note:", note);
  console.log("[addNote] ImageFile:", imageFile);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("[addNote] User:", user);
  console.log("[addNote] UserError:", userError);

  if (!user) {
    console.log("[addNote] Ingen bruker → avbryter");
    return;
  }

  let imageUrl: string | null = null;

  // Hvis det finnes et bilde → last opp og hent URL
  if (imageFile && imageFile.size > 0) {
    try {
      imageUrl = await uploadNoteImage(imageFile, batchId!);
      console.log("[addNote] Image uploaded:", imageUrl);
    } catch (err) {
      console.log("[addNote] Image upload failed:", err);
    }
  }

  const { error: insertError } = await supabase
    .from("batch_notes")
    .insert({
      batch_id: batchId,
      user_id: user.id,
      note: note || null,
      image_url: imageUrl,
      note_type: imageUrl ? "image" : "text",
    });

  console.log("[addNote] InsertError:", insertError);

  // ⭐ NYTT: Revalidate slik at nye notater vises uten logout
  if (batchId) {
    revalidatePath(`/kar/${batchId}`);
  }

  console.log("=== addNote END ===");
}
