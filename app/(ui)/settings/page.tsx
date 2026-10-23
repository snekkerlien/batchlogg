export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login?redirect=/settings");
  }

  return <SettingsClient />;
}
