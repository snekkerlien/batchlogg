import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();

  // ✔ Supabase server-klient uten ulovlig cookie-modifikasjon
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // ❗ Ikke skriv cookies i server components
        set() {},
        remove() {},
      },
    }
  );

  // ✔ Trygg server-side session check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // ✔ Hent profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // ✔ Hent kar
  const { data: kar } = await supabase
    .from("kar")
    .select("id, created_at")
    .eq("user_id", user.id)
    .order("created_at");

  return (
    <DashboardClient
      username={profile?.username ?? "Ukjent"}
      kar={kar ?? []}
    />
  );
}
