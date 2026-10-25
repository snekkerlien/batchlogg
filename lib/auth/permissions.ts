import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MembershipRole = "member" | "moderator" | "admin";
export const PREMIUM_ROLE_STATUSES = [
  "admin",
  "moderator",
  "sponsor",
  "partner",
  "founder",
] as const;
export type Permission =
  | "manage_users"
  | "manage_memberships"
  | "assign_roles"
  | "review_reports"
  | "moderate_community_members"
  | "delete_reported_content"
  | "lock_threads"
  | "feature_content"
  | "view_analytics"
  | "manage_changelog"
  | "broadcast_announcements"
  | "manage_maintenance";

const rolePermissions: Record<MembershipRole, ReadonlySet<Permission>> = {
  member: new Set(),
  moderator: new Set([
    "review_reports",
    "moderate_community_members",
    "delete_reported_content",
    "lock_threads",
    "feature_content",
  ]),
  admin: new Set([
    "manage_users",
    "manage_memberships",
    "assign_roles",
    "review_reports",
    "moderate_community_members",
    "delete_reported_content",
    "lock_threads",
    "feature_content",
    "view_analytics",
    "manage_changelog",
    "broadcast_announcements",
    "manage_maintenance",
  ]),
};

export function normalizeMembershipRole(value: unknown): MembershipRole {
  return value === "admin" || value === "moderator" ? value : "member";
}

export function hasPremiumEntitlement(accountTier: unknown, membershipStatus: unknown) {
  return accountTier === "premium" ||
    PREMIUM_ROLE_STATUSES.some((status) => status === membershipStatus);
}

export type PremiumAccessSource = "manual" | "subscription" | "role";

export function getPremiumAccessSources(profile: {
  account_tier: unknown;
  premium_grant_source: unknown;
  membership_status: unknown;
}): PremiumAccessSource[] {
  const sources: PremiumAccessSource[] = [];
  if (profile.account_tier === "premium") {
    sources.push(profile.premium_grant_source === "stripe" ? "subscription" : "manual");
  }
  if (PREMIUM_ROLE_STATUSES.some((status) => status === profile.membership_status)) {
    sources.push("role");
  }
  return sources;
}

export function hasPermission(role: MembershipRole, permission: Permission) {
  return rolePermissions[role].has(permission);
}

export async function getMembershipRole(
  supabase: SupabaseClient,
  user: User | null
): Promise<MembershipRole> {
  if (!user) return "member";

  const { data, error } = await supabase
    .from("profiles")
    .select("membership_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Could not load membership role", error);
    throw new Error("Could not verify account permissions");
  }

  return normalizeMembershipRole(data?.membership_status);
}
