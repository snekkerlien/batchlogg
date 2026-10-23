export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export default async function DashboardPage() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=%2Fdashboard");

  return (
    <main className="min-h-screen p-6 text-white">
      <DashboardClient />
    </main>
  );
}
