export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { syncUserVesselLimit } from "@/lib/vessels/limits";

export default async function NewKarPage() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await syncUserVesselLimit(serviceRole, user.id);
  const { data, error } = await supabase.rpc("create_kar_with_limit");

  if (error) {
    throw new Error(`Failed to create vessel: ${error.message}`);
  }

  redirect(data.created ? "/dashboard" : "/dashboard?error=vessel-limit");
}
