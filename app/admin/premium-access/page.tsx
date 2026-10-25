import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import {
  getMembershipRole,
  getPremiumAccessSources,
  hasPermission,
} from "@/lib/auth/permissions";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import PremiumAccessClient, {
  type PremiumAccessUser,
} from "./PremiumAccessClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PremiumAccessPage() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const role = authError ? "member" : await getMembershipRole(supabase, user);

  if (!hasPermission(role, "manage_users")) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">
            This page is only available to administrators.
          </p>
          <Link href="/" className="mt-6 inline-block underline">
            Go to main site
          </Link>
        </div>
      </main>
    );
  }

  const serviceRole = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const profiles: Array<{
    id: string;
    username: string | null;
    membership_status: string | null;
    account_tier: string | null;
    premium_grant_source: string | null;
    stripe_subscription_status: string | null;
    stripe_current_period_end: string | null;
  }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await serviceRole
      .from("profiles")
      .select(
        "id, username, membership_status, account_tier, premium_grant_source, stripe_subscription_status, stripe_current_period_end"
      )
      .range(from, from + 999);
    if (error) {
      console.error("Could not load Premium access profiles", error);
      throw new Error("Could not load Premium access users");
    }
    profiles.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const activeProfiles = profiles.filter(
    (profile) => getPremiumAccessSources(profile).length > 0
  );
  const activeProfileIds = new Set(activeProfiles.map((profile) => profile.id));
  const authUsers = new Map<string, string>();
  for (let page = 1; ; page += 1) {
    const { data, error } = await serviceRole.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      console.error("Could not load Premium access user emails", error);
      throw new Error("Could not load Premium access user details");
    }
    for (const authUser of data.users) {
      if (activeProfileIds.has(authUser.id)) {
        authUsers.set(authUser.id, authUser.email ?? "");
      }
    }
    if (data.users.length < 1000) break;
  }

  const premiumUsers: PremiumAccessUser[] = activeProfiles
    .map((profile) => ({
      id: profile.id,
      username: profile.username?.trim() || "(no username)",
      email: authUsers.get(profile.id) ?? "",
      membership_status: profile.membership_status ?? "member",
      account_tier: profile.account_tier ?? "free",
      premium_grant_source: profile.premium_grant_source,
      stripe_subscription_status: profile.stripe_subscription_status,
      stripe_current_period_end: profile.stripe_current_period_end,
      sources: getPremiumAccessSources(profile),
    }))
    .sort((a, b) => a.username.localeCompare(b.username));

  return (
    <main className="min-h-screen px-4 py-12 text-white sm:px-6">
      <div className="relative mx-auto mt-12 max-w-6xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <BackButton />
        </div>
        <div className="absolute right-4 top-2 z-40 sm:top-4">
          <MenuOverlay current="admin" />
        </div>
        <PageHeading
          title="Premium access"
          subtitle="Review every account with active Premium access and see all applicable access sources."
        />
        <p className="mb-6 text-center text-sm text-white/60">
          {premiumUsers.length} account{premiumUsers.length === 1 ? "" : "s"} with
          Premium access
        </p>
        <PremiumAccessClient users={premiumUsers} />
      </div>
    </main>
  );
}
