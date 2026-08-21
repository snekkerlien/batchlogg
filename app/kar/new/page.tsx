export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export default async function NewKarPage() {
  console.log("=== /kar/new START ===");

  // RIKTIG: destructure supabase-klienten
  const { supabase } = supabaseServer();

  // Hent bruker
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("User:", user);
  console.log("UserError:", userError);

  if (!user) {
    console.log("Ingen bruker, redirecter til login...");
    redirect("/auth/login");
  }

  // Hent alle kar for å finne neste nummer
  const { data: karRaw, error: karFetchError } = await supabase
    .from("kar")
    .select("nummer")
    .eq("user_id", user.id)
    .order("nummer", { ascending: true });

  console.log("karRaw:", karRaw);
  console.log("karFetchError:", karFetchError);

  const nextNummer = (karRaw?.length ?? 0) + 1;
  console.log("nextNummer:", nextNummer);

  // Opprett nytt kar
  const { error: insertError } = await supabase
    .from("kar")
    .insert({
      user_id: user.id,
      nummer: nextNummer,
    });

  console.log("insertError:", insertError);

  if (insertError) {
    console.log("FEIL VED INSERT:", insertError);
    throw new Error("Kunne ikke opprette nytt kar");
  }

  console.log("Kar opprettet OK. Redirecter til dashboard...");

  redirect("/dashboard");

  console.log("=== /kar/new END ===");
}
