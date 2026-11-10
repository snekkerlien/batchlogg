import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole } from "@/lib/auth/permissions";
import { isFeatureEnabled, type FeatureToggleKey } from "./toggles";

export async function requireVisibleFeature(key: FeatureToggleKey) {
  const { supabase } = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await getMembershipRole(supabase, user);
  if (role !== "developer" && !(await isFeatureEnabled(supabase, key))) notFound();
}
