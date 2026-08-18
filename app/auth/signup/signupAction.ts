"use server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function signupAction(username: string, password: string) {
  console.log("SIGNUP ACTION STARTED");

  const supabase = supabaseAdmin();
  const email = `${username}@invalid.test`;

  console.log("EMAIL:", email);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  console.log("SUPABASE RESPONSE:", data, error);

  if (error) {
    console.error("SUPABASE ERROR:", error);
    throw new Error(error.message);
  }

  console.log("SIGNUP SUCCESS:", data);

  return { user: data.user };
}
