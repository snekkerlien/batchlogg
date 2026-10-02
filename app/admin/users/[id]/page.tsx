import { revalidatePath } from "next/cache";
import { supabaseServer } from "../../../../lib/supabase/supabaseServerFinal";
import { isAdminUser } from "../../../../lib/auth/isAdminUser";

export const runtime = "nodejs";

export default async function UserAdminPage({ params }: any) {
  const userId = params.id;
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminUser(user)) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-red-400 text-xl font-bold">Access denied.</p>
      </main>
    );
  }

  const { data: authUser, error: authUserError } =
    await serviceRole.auth.admin.getUserById(userId);
  if (authUserError) {
    throw new Error(`Failed to load user: ${authUserError.message}`);
  }

  const { data: profile, error: profileError } = await serviceRole
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (profileError) {
    throw new Error(`Failed to load user profile: ${profileError.message}`);
  }

  async function updateUser(formData: FormData) {
    "use server";

    const { supabase: actionSupabase, serviceRole: actionServiceRole } =
      supabaseServer();
    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!isAdminUser(actionUser)) {
      throw new Error("Forbidden");
    }

    const email = formData.get("email")?.toString();
    const username = formData.get("username")?.toString();

    if (!email || !username) {
      throw new Error("Email and username are required");
    }

    const { error: authUpdateError } =
      await actionServiceRole.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
      });

    if (authUpdateError) {
      throw new Error(`Failed to update email: ${authUpdateError.message}`);
    }

    const { error: profileUpdateError } = await actionServiceRole
      .from("profiles")
      .update({ email, username })
      .eq("id", userId);

    if (profileUpdateError) {
      throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
    }

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
