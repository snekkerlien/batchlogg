import { supabase } from "../../../lib/supabaseClient";

export async function signupAction(username: string, password: string) {
  const email = `${username}@fake.local`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
