import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import AdminBreweriesClient from "./AdminBreweriesClient";

export const dynamic = "force-dynamic";

export default async function AdminBreweriesPage() {
  const { supabase } = supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  const role = error ? "member" : await getMembershipRole(supabase, user);
  if (!hasPermission(role, "manage_users")) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">Only administrators can manage business accounts.</p>
          <Link href="/" className="mt-6 inline-block rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold">Go to main site</Link>
        </div>
      </main>
    );
  }
  return <AdminBreweriesClient />;
}
