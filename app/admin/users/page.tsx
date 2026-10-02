import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { isAdminUser } from "../../../lib/auth/isAdminUser";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

export const runtime = "nodejs";

export default async function UsersPage() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminUser(user)) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-white">
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

  // Admin client (bypasser RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  // Hent alle Auth-brukere
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

  // Hent alle profiler
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("*");

  // Slå sammen Auth + profiles
  const merged = authUsers.users.map((u) => {
    const profile = profiles?.find((p) => p.id === u.id);

    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      username: profile?.username ?? "(no username)",
      avatar_url: profile?.avatar_url ?? null,
      is_public: profile?.is_public ?? false,
    };
  });

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <Link
            href="/admin"
            aria-label="Back to Admin Dashboard"
            className="flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 transition hover:bg-white/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19l-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </Link>
        </div>
        <div className="absolute right-4 top-2 z-40 sm:top-4">
          <MenuOverlay current="admin" />
        </div>

        <PageHeading
          title="Manage users"
          subtitle="Review accounts and update user details."
        />

        {merged.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
            No users found.
          </div>
        ) : (
          <div className="space-y-4">
            {merged.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="group block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-green-400/30 hover:bg-white/10"
              >
                <div className="flex items-center gap-4">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt=""
                      className="h-12 w-12 rounded-full border border-white/20 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60">
                      ?
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-green-300">
                      {u.username}
                    </p>
                    <p className="break-all text-sm text-white/80">{u.email}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Created: {new Date(u.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {u.is_public ? "Public profile" : "Private profile"}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="ml-auto text-xl text-green-300 transition group-hover:translate-x-1"
                  >
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
