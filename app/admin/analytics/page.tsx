import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { AdminAnalyticsClient } from "./AdminAnalyticsClient";

export const runtime = "nodejs";

export default async function AdminAnalyticsPage() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const role = error ? "member" : await getMembershipRole(supabase, user);
  if (!hasPermission(role, "view_analytics")) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">You cannot view community analytics.</p>
          <Link href="/" className="mt-6 inline-block underline">Go to main site</Link>
        </div>
      </main>
    );
  }
  return <AdminAnalyticsClient />;
}
