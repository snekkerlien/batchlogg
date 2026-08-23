import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

/**
 * Laster opp et bilde til Supabase Storage og returnerer en public URL.
 * Brukes av addNote.ts når et notat inneholder et bilde.
 */

export async function uploadNoteImage(file: File, batchId: string) {
  console.log("=== uploadNoteImage START ===");
  console.log("[uploadNoteImage] File:", file);
  console.log("[uploadNoteImage] Batch ID:", batchId);

  const { supabase } = await supabaseServer();

  // Lag en unik filsti i bucket
  const filePath = `${batchId}/${Date.now()}-${file.name}`;

  // Last opp filen
  const { data, error } = await supabase.storage
    .from("batch-images")
    .upload(filePath, file);

  console.log("[uploadNoteImage] Upload error:", error);

  if (error) {
    throw new Error("Kunne ikke laste opp bilde til Supabase Storage");
  }

  // Hent public URL
  const { data: urlData } = supabase.storage
    .from("batch-images")
    .getPublicUrl(filePath);

  console.log("[uploadNoteImage] Public URL:", urlData?.publicUrl);
  console.log("=== uploadNoteImage END ===");

  return urlData.publicUrl;
}
