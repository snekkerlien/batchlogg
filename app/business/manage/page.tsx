import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole } from "@/lib/auth/permissions";
import { isFeatureEnabled } from "@/lib/features/toggles";
import BreweryManageClient from "../BreweryManageClient";

export const dynamic = "force-dynamic";

export default async function BreweryManagePage() {
  const { supabase } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = await getMembershipRole(supabase, user);
  const featureEnabled = await isFeatureEnabled(supabase, "business-accounts");

  if (!featureEnabled && role !== "developer") notFound();

  return <BreweryManageClient />;
}
