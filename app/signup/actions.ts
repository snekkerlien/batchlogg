"use server";

import { supabaseServer } from "../../lib/supabaseServer";

export async function createProfile(userId: string, username: string) {
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("public_profiles")
    .insert({
      id: userId,
      username,
    });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
