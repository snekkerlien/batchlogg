"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export async function changeUsername(formData: FormData) {
  console.log("=== changeUsername START ===");

  const { supabase, token } = supabaseServer();

  console.log("[changeUsername] Token:", token);

  if (!token) {
    console.log("[changeUsername] Ingen token → redirect");
    redirect("/auth/login");
  }

  const newUsername = formData.get("newUsername")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  console.log("[changeUsername] Nytt brukernavn:", newUsername);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  console.log("[changeUsername] User:", user);
  console.log("[changeUsername] UserError:", userError);

  if (!user) redirect("/auth/login");

  // Verifiser passord via Supabase-klient (JWT)
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

  // Logg ut ved å slette session i browseren (ikke server)
  redirect(
    "/auth/login?info=Brukernavn+oppdatert.+Logg+inn+med+det+nye+brukernavnet."
  );
}
