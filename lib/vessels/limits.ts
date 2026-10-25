import type { SupabaseClient } from "@supabase/supabase-js";
import { hasPremiumEntitlement } from "@/lib/auth/plan";

export const FREE_MAX_VESSELS = 6;
export const PREMIUM_MAX_VESSELS = 20;

export function getMaxVessels(
  accountTier: string | null | undefined,
  membershipStatus?: string | null
) {
  return hasPremiumEntitlement(accountTier, membershipStatus)
    ? PREMIUM_MAX_VESSELS
    : FREE_MAX_VESSELS;
}

export async function syncUserVesselLimit(
  serviceRole: SupabaseClient,
  userId: string
) {
  const { data: profile, error: profileError } = await serviceRole
    .from("profiles")
    .select("account_tier, membership_status, max_vessels")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Could not load vessel limit: ${profileError.message}`);
  }
  if (!profile) {
    throw new Error("Could not load vessel limit: profile not found");
  }

  const maxVessels = getMaxVessels(profile.account_tier, profile.membership_status);
  if (profile.max_vessels === maxVessels) return maxVessels;

  const { error: updateError } = await serviceRole
    .from("profiles")
    .update({ max_vessels: maxVessels })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Could not update vessel limit: ${updateError.message}`);
  }

  return maxVessels;
}
