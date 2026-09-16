import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export default async function UserAdminPage({ params }: any) {
  const userId = params.id;

  // Hent data på server (trygt)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false }
    }
  );

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  // ⭐ SERVER ACTION — bruker din fix-email route
  async function updateUser(formData: FormData) {
  "use server";

  const email = formData.get("email")?.toString();
  const username = formData.get("username")?.toString();

  // 1. Oppdater e‑post via din egen admin‑route
  await fetch("/admin/fix-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      newEmail: email,
    }),
  });

  // 2. Oppdater username via en ny route
  await fetch("/admin/fix-username", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      username,
    }),
  });

  revalidatePath(`/admin/users/${userId}`);
}


  return (
    <main className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-6">Edit User</h1>

      {/* Dashboard knapp */}
      <div className="mb-6">
        <a
          href="/dashboard"
          className="text-blue-400 underline text-lg"
        >
          ← Back to Dashboard
        </a>
      </div>

      <form action={updateUser} className="space-y-4 max-w-md">
        <label className="block">
          <span className="text-sm text-gray-300">Email</span>
          <input
            name="email"
            defaultValue={authUser.user?.email ?? ""}
            className="w-full p-3 bg-black/40 border border-white/20 rounded-lg"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-300">Username</span>
          <input
            name="username"
            defaultValue={profile?.username ?? ""}
            className="w-full p-3 bg-black/40 border border-white/20 rounded-lg"
          />
        </label>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold"
        >
          Save Changes
        </button>
      </form>
    </main>
  );
}
