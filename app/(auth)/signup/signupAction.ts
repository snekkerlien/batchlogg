"use server";

import { supabaseServer } from "../../../lib/supabaseServer";

export async function signupAction(username: string, password: string) {
  const supabase = await supabaseServer();

  const fakeEmail = `${username}@fake.local`;

  const { data, error } = await supabase.auth.signUp({
    email: fakeEmail,
    password,
  });

  if (error) {
    console.error("SIGNUP ERROR:", error);
    throw error;
  }

  return data;
}
