export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { redirect } from "next/navigation";
import { supabaseServer } from "../../lib/supabase/supabaseServerFinal";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = supabaseServer;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: karRaw } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", user.id)
    .order("nummer");

  const { data: batchesRaw } = await supabase
    .from("batches")
    .select("*")
    .eq("user_id", user.id);

  const kar = (karRaw ?? []).map((k: any, index: number) => {
    const activeBatch = batchesRaw?.find(
      (b: any) => b.aktivt_kar === k.id && b.status === "Aktiv"
    );

    return {
      id: k.id,
      nummer: k.nummer,                 // ekte nummer
      displayNummer: index + 1,         // UI-nummer
      user_id: k.user_id,
      created_at: k.created_at,
      status: activeBatch ? ("Aktiv" as const) : ("Ledig" as const), // ← FIX
    };
  });

  return (
    <main className="min-h-screen p-6 text-white">
      <DashboardClient
        username={profile?.username ?? "Ukjent"}
        kar={kar}
      />
    </main>
  );
}
