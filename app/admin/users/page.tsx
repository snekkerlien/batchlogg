import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const runtime = "nodejs";

export default async function UsersPage() {
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
    <main className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-6">Manage Users</h1>

      {/* Dashboard knapp */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-blue-400 underline text-lg"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="space-y-4">
        {merged.map((u) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="block p-4 bg-black/40 border border-white/10 rounded-lg hover:bg-black/60 transition"
          >
            <div className="flex items-center gap-4">
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  alt="avatar"
                  className="w-12 h-12 rounded-full object-cover border border-white/20"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/60">
                  ?
                </div>
              )}

              <div>
                <p className="text-xl font-semibold">{u.username}</p>
                <p className="text-sm text-gray-300">{u.email}</p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(u.created_at).toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">
                  {u.is_public ? "Public profile" : "Private profile"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
