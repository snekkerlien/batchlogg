export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export default async function NewKarPage() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase.rpc("create_kar_with_limit");

  if (error) {
    throw new Error(`Failed to create vessel: ${error.message}`);
  }

  redirect(data.created ? "/dashboard" : "/dashboard?error=vessel-limit");
}
