export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login?redirect=/dashboard");
  }

  return (
    <main className="min-h-screen p-6 text-white">
      <DashboardClient />
    </main>
  );
}
