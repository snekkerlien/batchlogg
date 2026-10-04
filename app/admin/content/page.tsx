import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { AdminContentClient } from "./AdminContentClient";

export const runtime = "nodejs";

export default async function AdminContentPage() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const role = error ? "member" : await getMembershipRole(supabase, user);
  if (
    !hasPermission(role, "manage_changelog") &&
    !hasPermission(role, "broadcast_announcements")
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">You cannot manage site updates.</p>
          <Link href="/" className="mt-6 inline-block underline">Go to main site</Link>
        </div>
      </main>
    );
  }
  return <AdminContentClient />;
}
