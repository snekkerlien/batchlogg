import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export type BreweryAccount = {
  id: string;
  owner_id: string;
  name: string;
  business_type: string;
  business_type_other: string | null;
  slug: string;
  description: string;
  location: string;
  website_url: string | null;
  logo_url: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  approved_by: string | null;
  approved_at: string | null;
  manual_access_granted_by: string | null;
  manual_access_granted_at: string | null;
  manual_access_expires_at: string | null;
  manual_access_note: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  stripe_current_period_end: string | null;
};

export function hasBreweryAccess(
  account: Pick<
    BreweryAccount,
    | "status"
    | "manual_access_granted_at"
    | "manual_access_expires_at"
    | "stripe_subscription_status"
  >,
  now = Date.now()
) {
  if (account.status !== "approved") return false;
  const manualGrantActive =
    !!account.manual_access_granted_at &&
    (!account.manual_access_expires_at ||
      Date.parse(account.manual_access_expires_at) > now);
  return (
    manualGrantActive ||
    ["active", "trialing", "past_due"].includes(account.stripe_subscription_status ?? "")
  );
}

export function canManageBreweryProducts(role: string | null) {
  return role === "owner" || role === "manager" || role === "editor";
}

export function canViewBreweryAnalytics(role: string | null) {
  return role === "owner" || role === "manager" || role === "editor";
}

export function canEditBreweryPage(role: string | null) {
  return role === "owner" || role === "manager";
}

export function normalizeBreweryMemberRole(
  role: string | null | undefined
): "manager" | "editor" | null {
  if (role === "manager") return "manager";
  if (role === "editor" || role === "analyst") return "editor";
  return null;
}

export function slugifyBreweryValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function normalizeOptionalUrl(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || !url.hostname) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function getBreweryContext(): Promise<{
  user: User;
  serviceRole: SupabaseClient;
  account: BreweryAccount | null;
  isOwner: boolean;
  role: string | null;
  businesses: { id: string; name: string; slug: string; role: string | null; isOwner: boolean }[];
}> {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Authentication required");

  const [{ data: ownedAccount, error: ownerError }, { data: memberships, error: memberError }] =
    await Promise.all([
      serviceRole
        .from("brewery_accounts")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle(),
      serviceRole
        .from("brewery_members")
        .select("brewery_id, role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);
  if (ownerError) throw new Error(`Could not load brewery account: ${ownerError.message}`);
  if (memberError) throw new Error(`Could not load brewery memberships: ${memberError.message}`);

  const memberIds = (memberships ?? []).map((membership) => membership.brewery_id);
  const { data: memberAccounts, error: accountsError } = memberIds.length
    ? await serviceRole.from("brewery_accounts").select("*").in("id", memberIds)
    : { data: [], error: null };
  if (accountsError) throw new Error(`Could not load brewery accounts: ${accountsError.message}`);

  const memberRoles = new Map(
    (memberships ?? []).map((membership) => [membership.brewery_id, membership.role])
  );
  const allAccounts = new Map<string, BreweryAccount>();
  if (ownedAccount) allAccounts.set(ownedAccount.id, ownedAccount as BreweryAccount);
  const memberAccountById = new Map(
    (memberAccounts ?? []).map((memberAccount) => [memberAccount.id, memberAccount as BreweryAccount])
  );
  for (const membership of memberships ?? []) {
    const memberAccount = memberAccountById.get(membership.brewery_id);
    if (!memberAccount) continue;
    allAccounts.set(memberAccount.id, memberAccount as BreweryAccount);
  }
  const businesses = Array.from(allAccounts.values()).map((business) => {
    const isOwner = business.owner_id === user.id;
    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      role: isOwner ? "owner" : normalizeBreweryMemberRole(memberRoles.get(business.id)),
      isOwner,
    };
  });

  const selectedBusinessId = cookies().get("active_brewery_id")?.value;
  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId);
  const business = selectedBusiness
    ? allAccounts.get(selectedBusiness.id)
    : ownedAccount ?? (businesses[0] ? allAccounts.get(businesses[0].id) : null);
  const isOwner = business?.owner_id === user.id;
  const role = !business
    ? null
    : isOwner
      ? "owner"
      : normalizeBreweryMemberRole(memberRoles.get(business.id));

  return {
    user,
    serviceRole,
    account: business ?? null,
    isOwner,
    role,
    businesses,
  };
}
