import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient } from "../../lib/supabase/supabaseServerFinal";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  console.log("🐛 DEBUG: Dashboard START");

  const cookieStore = cookies();
  console.log("🐛 DEBUG: Incoming cookies =", cookieStore.getAll());

  // Supabase server-klient (Edge-kompatibel)
  const supabase = createServerComponentClient();

  // Hent session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  console.log("🐛 DEBUG: session =", session);
  console.log("🐛 DEBUG: sessionError =", sessionError);

  if (!session) {
    console.log("❌ DEBUG: Ingen session → redirect til login");
    redirect("/auth/login");
  }

  const user = session.user;
  console.log("👤 DEBUG: user.id =", user.id);

  // Hent profil
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  console.log("🐛 DEBUG: profile =", profile);
  console.log("🐛 DEBUG: profileError =", profileError);

  // Hent kar + aktiv batch-status
  const { data: karRaw, error: karError } = await supabase
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

  console.log("📦 DEBUG: karRaw =", karRaw);
  console.log("⚠️ DEBUG: karError =", karError);

  // Map til format DashboardClient forventer
  const kar = (karRaw ?? []).map((k: any) => ({
    id: k.id,
    created_at: k.created_at,
    status: (k.Batches?.[0]?.status === "Aktiv" ? "Aktiv" : "Ledig") as
      "Aktiv" | "Ledig",
  }));

  console.log("📦 DEBUG: kar (mapped) =", kar);

  console.log("🐛 DEBUG: Dashboard RENDER");

  return (
    <DashboardClient
      username={profile?.username ?? "Ukjent"}
      kar={kar}
    />
  );
}
