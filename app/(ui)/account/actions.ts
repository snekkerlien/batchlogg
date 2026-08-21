"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export async function changeUsername(formData: FormData) {
  console.log("=== changeUsername START ===");

  // Bruk SSR-klienten (leser cookies automatisk)
  const { supabase } = await supabaseServer();

  const newUsername = formData.get("newUsername")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  console.log("[changeUsername] Nytt brukernavn:", newUsername);

  // Hent bruker fra cookies
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("[changeUsername] User:", user);
  console.log("[changeUsername] UserError:", userError);

  if (!user) {
    console.log("[changeUsername] Ingen bruker → redirect");
    redirect("/auth/login");
  }

  // Verifiser passord via direkte Supabase-klient (JWT)
  const supabaseDirect = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const { error: loginError } = await supabaseDirect.auth.signInWithPassword({
    email: user.email!,
    password,
  });

  console.log("[changeUsername] Passordverifisering:", loginError);

  if (loginError) {
    redirect("/account?error=Feil+passord");
  }

  // Oppdater brukernavn
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ username: newUsername })
    .eq("id", user.id);

  console.log("[changeUsername] UpdateError:", updateError);

  if (updateError) {
    redirect("/account?error=Kunne+ikke+oppdatere+brukernavn");
  }

  console.log("[changeUsername] Brukernavn oppdatert");

  // Redirect til login for å oppdatere session
  redirect(
    "/auth/login?info=Brukernavn+oppdatert.+Logg+inn+med+det+nye+brukernavnet."
  );
}
