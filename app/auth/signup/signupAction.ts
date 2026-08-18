"use server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function signupAction(username: string, password: string) {
  const supabase = supabaseAdmin();

  const email = `${username}@invalid.test`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error) {
    throw new Error(error.message);
  }

  return { user: data.user };
}
