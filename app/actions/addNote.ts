"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function addNote(formData: FormData) {
  console.log("=== addNote START ===");

  // Bruk SSR-klienten (leser cookies automatisk)
  const { supabase } = supabaseServer();

  const batchId = formData.get("batch_id")?.toString();
  const note = formData.get("note")?.toString() ?? "";

  console.log("[addNote] Batch ID:", batchId);
  console.log("[addNote] Note:", note);

  // Hent bruker fra cookies
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

  // Legg til notat
  const { error: insertError } = await supabase
    .from("batch_notes")
    .insert({
      batch_id: batchId,
      user_id: user.id,
      note,
    });

  console.log("[addNote] InsertError:", insertError);

  console.log("=== addNote END ===");
}
