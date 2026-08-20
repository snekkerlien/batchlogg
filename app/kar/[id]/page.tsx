import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import ActiveBatch from "./ActiveBatch";
import RegisterBatchForm from "./RegisterBatchForm";

export const dynamic = "force-dynamic";

export default async function KarPage() {
  const cookieStore = await cookies();

  // Supabase server-klient
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  // Session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const user = session.user;

  // Hent kar-id fra URL
  const karId = cookieStore.get("next-url")?.value ?? null;

  // Hent kar-info
  const { data: kar } = await supabase
    .from("kar")
    .select("id, user_id")
    .eq("id", karId)
    .maybeSingle();

  if (!kar) {
    redirect("/dashboard");
  }

  // Sjekk eierskap
  const isOwner = kar.user_id === user.id;

  // Hent aktiv batch
  const { data: batch } = await supabase
    .from("Batches")
    .select("*")
    .eq("aktivt_kar", karId)
    .eq("status", "Aktiv")
    .maybeSingle();

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-2xl border border-white/10 text-white">

        {/* Aktiv batch */}
        {batch && <ActiveBatch batch={batch} />}

        {/* Ledig kar */}
        {!batch && isOwner && <RegisterBatchForm karId={karId!} />}

        {!batch && !isOwner && (
          <p className="text-gray-300 mt-4">Dette karet er i bruk.</p>
        )}
      </div>
    </main>
  );
}
