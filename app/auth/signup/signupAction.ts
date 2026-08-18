"use server";

import { createClient } from "@supabase/supabase-js";

export async function signupAction(username: string, password: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const fakeEmail = `${username}@fake.local`;

  const { data, error } = await supabase.auth.admin.createUser({
    email: fakeEmail,
    password,
    email_confirm: true
  });

  if (error) {
    return { error: error.message };
  }

  return { user: data.user };
}
