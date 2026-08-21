export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { redirect } from "next/navigation";
import { createServerComponentClient } from "../../lib/supabase/supabaseServerFinal";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = createServerComponentClient();

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

  const { data: karRaw, error: karError } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", user.id)
    .order("id");

  const { data: batchesRaw, error: batchError } = await supabase
    .from("batches")
    .select("*")
    .eq("user_id", user.id);

  const kar = (karRaw ?? []).map((k: any, index: number) => {
    const activeBatch = batchesRaw?.find(
      (b: any) => b.aktivt_kar === k.id && b.status === "Aktiv"
    );

    return {
      id: k.id,
      nummer: k.nummer,
      displayNummer: index + 1,
      user_id: k.user_id,
      created_at: k.created_at,
      status: activeBatch ? ("Aktiv" as const) : ("Ledig" as const),
    };
  });

  return (
    <main className="min-h-screen p-6 text-white">
      <DashboardClient
        username={profile?.username ?? "Ukjent"}
        kar={kar}
      />

      <div className="mt-10 p-4 bg-red-900/40 border border-red-600 rounded-lg text-xs whitespace-pre-wrap">
        <h2 className="font-bold mb-2">DEBUG: Dashboard</h2>

        <p><strong>User:</strong> {JSON.stringify(user, null, 2)}</p>
        <p><strong>Profile:</strong> {JSON.stringify(profile, null, 2)}</p>

        <p><strong>karRaw:</strong> {JSON.stringify(karRaw, null, 2)}</p>
        <p><strong>karError:</strong> {JSON.stringify(karError, null, 2)}</p>

        <p><strong>batchesRaw:</strong> {JSON.stringify(batchesRaw, null, 2)}</p>
        <p><strong>batchError:</strong> {JSON.stringify(batchError, null, 2)}</p>

        <p><strong>kar (mapped):</strong> {JSON.stringify(kar, null, 2)}</p>
      </div>
    </main>
  );
}
