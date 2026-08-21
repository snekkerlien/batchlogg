"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";

export async function changeUsername(formData: FormData) {
  const supabase = supabaseServer();

  const newUsername = formData.get("newUsername")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Verifiser passord
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  });

  if (loginError) {
    redirect("/account?error=Feil+passord");
  }

  // Oppdater brukernavn
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ username: newUsername })
    .eq("id", user.id);

  if (updateError) {
    redirect("/account?error=Kunne+ikke+oppdatere+brukernavn");
  }

  // Logg ut
  await supabase.auth.signOut();

  redirect("/auth/login?info=Brukernavn+oppdatert.+Logg+inn+med+det+nye+brukernavnet.");
}
