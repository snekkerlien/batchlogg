"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { syncUserVesselLimit } from "@/lib/vessels/limits";

export async function addKar() {
  const { supabase, serviceRole } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await syncUserVesselLimit(serviceRole, user.id);
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
