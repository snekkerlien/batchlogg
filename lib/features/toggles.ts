import type { SupabaseClient } from "@supabase/supabase-js";

export type FeatureToggleKey = "business-accounts" | "brewery-reviews";

export interface FeatureToggle {
  id: string;
  key: FeatureToggleKey;
  name: string;
  description: string | null;
  enabled: boolean;
  requires_developer_only: boolean;
  created_at: string;
  updated_at: string;
}

export async function isFeatureEnabled(
  supabase: SupabaseClient,
  toggleKey: FeatureToggleKey
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("feature_toggles")
      .select("enabled")
      .eq("key", toggleKey)
      .maybeSingle();

    if (error) {
      // If the table doesn't exist or there's another error, log it but don't throw
      // Default to false for safety
      console.warn(`Warning checking feature toggle ${toggleKey}:`, error.message);
      return false;
    }

    return data?.enabled ?? false;
  } catch (err) {
    // Catch any runtime errors and return false
    console.warn(`Error checking feature toggle ${toggleKey}:`, err);
    return false;
  }
}

export async function getFeatureToggle(
  supabase: SupabaseClient,
  toggleKey: FeatureToggleKey
): Promise<FeatureToggle | null> {
  const { data, error } = await supabase
    .from("feature_toggles")
    .select("*")
    .eq("key", toggleKey)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching feature toggle ${toggleKey}:`, error);
    return null;
  }

  return data;
}

export async function getAllFeatureToggles(
  supabase: SupabaseClient
): Promise<FeatureToggle[]> {
  const { data, error } = await supabase
    .from("feature_toggles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching all feature toggles:", error);
    throw new Error("Could not load feature toggles.");
  }

  return data ?? [];
}

export async function updateFeatureToggle(
  supabase: SupabaseClient,
  toggleKey: FeatureToggleKey,
  enabled: boolean,
  userId: string
): Promise<{ toggle: FeatureToggle; auditError: boolean }> {
  const { data, error } = await supabase
    .from("feature_toggles")
    .update({
      enabled,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("key", toggleKey)
    .select()
    .maybeSingle();

  if (error) {
    console.error(`Error updating feature toggle ${toggleKey}:`, error);
    throw new Error("Could not update feature toggle.");
  }
  if (!data) {
    throw new Error(`Feature toggle ${toggleKey} was not found.`);
  }

  const { error: auditError } = await supabase.from("feature_toggles_audit").insert({
    toggle_key: toggleKey,
    enabled,
    changed_by: userId,
  });
  if (auditError) {
    console.error(`Feature toggle ${toggleKey} updated, but audit logging failed:`, auditError);
  }
  return { toggle: data, auditError: Boolean(auditError) };
}
