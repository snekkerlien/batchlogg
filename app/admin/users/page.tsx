import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import AdminUsersList from "./AdminUsersList";

export const runtime = "nodejs";

export default async function UsersPage() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = await getMembershipRole(supabase, user);
  if (!hasPermission(role, "manage_users")) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center backdrop-blur-md">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">
            This page is only available to administrators.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
          >
            Go to main site
          </Link>
        </div>
      </main>
    );
  }

  // Admin client (bypasser RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  // Hent alle Auth-brukere
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

  // Hent alle profiler
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("*");

  // Slå sammen Auth + profiles
  const merged = authUsers.users.map((u) => {
    const profile = profiles?.find((p) => p.id === u.id);

    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      username: profile?.username ?? "(no username)",
      avatar_url: profile?.avatar_url ?? null,
      is_public: profile?.is_public ?? false,
      membership_status: profile?.membership_status ?? "member",
      account_tier: profile?.account_tier === "premium" ? "premium" as const : "free" as const,
    };
  });

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <BackButton />
        </div>
        <div className="absolute right-4 top-2 z-40 sm:top-4">
          <MenuOverlay current="admin" />
        </div>

        <PageHeading
          title="Manage users"
          subtitle="Review accounts and update user details."
        />

        <AdminUsersList users={merged} />
      </div>
    </main>
  );
}
