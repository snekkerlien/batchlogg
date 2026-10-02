"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function addKar() {
  const { supabase } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase.rpc("create_kar_with_limit");

  if (error) {
    throw new Error(`Failed to create vessel: ${error.message}`);
  }

  if (!data) {
    throw new Error("Vessel creation returned no result");
  }

  if (!data.created) {
    throw new Error(`You have reached your limit of ${data.maxVessels} vessels.`);
  }
}
