import { redirect } from "next/navigation";
import { createServerComponentClient } from "../../../lib/supabase/supabaseServerFinal";
import DashboardClient from "../../dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Supabase server-klient (Edge-kompatibel)
  const supabase = createServerComponentClient();

  // Hent session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const user = session.user;

  // Hent profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // Hent kar + aktiv batch-status
  const { data: karRaw } = await supabase
    .from("kar")
    .select(`
      id,
      created_at,
      Batches (
        status
      )
    `)
    .eq("user_id", user.id)
    .order("created_at");

  // Map til format DashboardClient forventer
  const kar = (karRaw ?? []).map((k: any) => ({
    id: k.id,
    created_at: k.created_at,
    status: (k.Batches?.[0]?.status === "Aktiv" ? "Aktiv" : "Ledig") as
      "Aktiv" | "Ledig",
  }));

  return (
    <DashboardClient
      username={profile?.username ?? "Ukjent"}
      kar={kar}
    />
  );
}
