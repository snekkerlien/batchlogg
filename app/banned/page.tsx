import Link from "next/link";
import { redirect } from "next/navigation";
import BanNotice from "./BanNotice";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const dynamic = "force-dynamic";

export default async function BannedPage() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth/login");

  const now = new Date().toISOString();
  const { data: restriction, error } = await serviceRole
    .from("user_restrictions")
    .select("ends_at, reason")
    .eq("user_id", user.id)
    .eq("restriction_type", "ban")
    .is("revoked_at", null)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .maybeSingle();

  if (error) {
    console.error("Could not load account ban details", error);
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-white">
        <p role="alert" className="max-w-lg rounded-xl border border-red-400/30 bg-black/70 p-6 text-center">
          We could not load your account restriction details. Please try again later.
        </p>
      </main>
    );
  }
  if (!restriction) redirect("/dashboard");

  const { data: appeal, error: appealError } = await serviceRole
    .from("ban_appeals")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (appealError) {
    console.error("Could not load ban appeal status", appealError);
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-white">
        <p role="alert" className="max-w-lg rounded-xl border border-red-400/30 bg-black/70 p-6 text-center">
          We could not load your appeal status. Please try again later.
        </p>
      </main>
    );
  }

  const { data: appealMessages, error: appealMessagesError } = appeal
    ? await serviceRole
        .from("ban_appeal_messages")
        .select("id, sender_role, message, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (appealMessagesError) {
    console.error("Could not load ban appeal messages", appealMessagesError);
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-white">
        <p role="alert" className="max-w-lg rounded-xl border border-red-400/30 bg-black/70 p-6 text-center">
          We could not load your appeal messages. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-red-400/30 bg-black/75 p-6 shadow-2xl backdrop-blur sm:p-10">
        <BanNotice
          endsAt={restriction.ends_at}
          reason={restriction.reason}
          appealStatus={appeal?.status ?? null}
          appealMessages={appealMessages ?? []}
        />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/logout"
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
          >
            Log out
          </Link>
        </div>
      </section>
    </main>
  );
}
