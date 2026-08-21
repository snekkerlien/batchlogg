"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";

export async function changeUsername(formData: FormData) {
  const newUsername = formData.get("newUsername")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) redirect("/auth/login");

  const { error: loginError } = await supabaseServer.auth.signInWithPassword({
    email: user.email!,
    password,
  });

  if (loginError) {
    redirect("/account?error=Feil+passord");
  }

  const { error: updateError } = await supabaseServer
    .from("profiles")
    .update({ username: newUsername })
    .eq("id", user.id);

  if (updateError) {
    redirect("/account?error=Kunne+ikke+oppdatere+brukernavn");
  }

  await supabaseServer.auth.signOut();

  redirect("/auth/login?info=Brukernavn+oppdatert.+Logg+inn+med+det+nye+brukernavnet.");
}
