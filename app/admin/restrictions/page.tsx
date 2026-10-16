import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import RestrictionList from "./RestrictionList";

export const dynamic = "force-dynamic";

export default async function RestrictionsPage() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getMembershipRole(supabase, user);
  if (!hasPermission(role, "manage_users")) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center backdrop-blur-md">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">
            This page is only available to administrators.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
          >
            Go to main site
          </Link>
        </div>
      </main>
    );
  }

  const { data: restrictions, error } = await serviceRole
    .from("user_restrictions")
    .select("user_id, restriction_type, starts_at, ends_at, reason")
    .is("revoked_at", null)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order("starts_at", { ascending: false });
  if (error) console.error("Could not load active user restrictions", error);

  const userIds = [...new Set((restrictions ?? []).map((item) => item.user_id))];
  const { data: profiles, error: profilesError } = userIds.length
    ? await serviceRole.from("profiles").select("id, username").in("id", userIds)
    : { data: [], error: null };
  if (profilesError) {
    console.error("Could not load restricted member names", profilesError);
  }
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
  const items = (restrictions ?? []).map((item) => ({
    ...item,
    username: names.get(item.user_id) || item.user_id,
  }));

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <Link
            href="/admin"
            aria-label="Back to admin"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 hover:bg-white/20"
          >
            ←
          </Link>
        </div>
        <div className="absolute right-4 top-2 z-40 sm:top-4">
          <MenuOverlay current="admin" />
        </div>
        <PageHeading
          title="User restrictions"
          subtitle="Review active mutes and bans, and restore access when appropriate."
        />
        {error || profilesError ? (
          <p role="alert" className="text-center text-red-300">
            {error
              ? "Active restrictions could not be loaded."
              : "Restricted user details could not be loaded."}
          </p>
        ) : (
          <RestrictionList initialRestrictions={items} />
        )}
      </div>
    </main>
  );
}
