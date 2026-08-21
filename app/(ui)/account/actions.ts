"use server";

import { createServerComponentClient } from "@/lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";

export async function changeUsername(formData: FormData) {
  const supabase = createServerComponentClient();

  const newUsername = formData.get("newUsername") as string;
  const password = formData.get("password") as string;

  // Hent bruker
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Sjekk passord
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

  // Logg ut automatisk
  await supabase.auth.signOut();

  redirect("/auth/login?info=Brukernavn+oppdatert.+Logg+inn+med+det+nye+brukernavnet.");
}
