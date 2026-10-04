import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MembershipRole = "member" | "moderator" | "admin";
export type Permission =
  | "manage_users"
  | "manage_memberships"
  | "assign_roles"
  | "review_reports"
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
    "delete_reported_content",
    "lock_threads",
    "feature_content",
  ]),
  admin: new Set([
    "manage_users",
    "manage_memberships",
    "assign_roles",
    "review_reports",
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
