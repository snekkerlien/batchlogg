"use server";

import { supabaseServerClient } from "../../../lib/supabaseServerClient";

export async function signupAction(username: string, password: string) {
  console.log("SIGNUP ACTION STARTED");

  const supabase = await supabaseServerClient();
  const email = `${username}@fake.local`;

  console.log("EMAIL:", email);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  console.log("SUPABASE RESPONSE:", data, error);

  if (error) {
    console.error("SUPABASE ERROR:", error);
    throw new Error(error.message);
  }

  console.log("SIGNUP SUCCESS:", data);

  return { user: data.user };
}
