"use server";

import { supabaseServer } from "../../lib/supabaseServer";

export async function signupAction(formData: FormData) {
  const supabase = await supabaseServer();

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const fakeEmail = `${username}@fake.local`;

  // Registrer bruker
  const { data, error } = await supabase.auth.signUp({
    email: fakeEmail,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Triggeren lager profil automatisk
  return true;
}
