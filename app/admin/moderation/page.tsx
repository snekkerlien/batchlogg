import Link from "next/link";
import { getMembershipRole, hasPermission, type MembershipRole } from "@/lib/auth/permissions";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import MemberModerationClient from "./MemberModerationClient";

export const dynamic = "force-dynamic";

export default async function MemberModerationPage() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  let role: MembershipRole = "member";
  if (!error && user) role = await getMembershipRole(supabase, user);

  if (!hasPermission(role, "moderate_community_members")) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center backdrop-blur-md">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">You do not have permission to moderate community members.</p>
          <Link href="/" className="mt-6 inline-block rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">
            Go to main site
          </Link>
        </div>
      </main>
    );
  }

  return <MemberModerationClient />;
}
