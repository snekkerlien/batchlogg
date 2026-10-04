import { MEMBERSHIP_STATUSES, isMembershipStatus, membershipLabel } from "@/lib/auth/membership";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { supabaseServer } from "../../../../lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import DeleteUserButton from "./DeleteUserButton";

export const runtime = "nodejs";

export default async function UserAdminPage({
  params,
}: {
  params: { id: string };
}) {
  const userId = params.id;
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = await getMembershipRole(supabase, user);
  if (!hasPermission(role, "manage_users")) {
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

    const actionRole = await getMembershipRole(actionSupabase, actionUser);
    if (!hasPermission(actionRole, "manage_users")) {
      throw new Error("Forbidden");
    }

    const email = formData.get("email")?.toString();
    const username = formData.get("username")?.toString();
    const canManageKegs = formData.get("can_manage_kegs") === "on";
    const membershipStatus = formData.get("membership_status")?.toString();

    if (
      !email ||
      !username ||
      !isMembershipStatus(membershipStatus)
    ) {
      throw new Error("Email, username, and a valid role are required");
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
      .update({
        email,
        username,
        can_manage_kegs: canManageKegs,
        membership_status: membershipStatus,
      })
      .eq("id", userId);

    if (profileUpdateError) {
      throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
    }

    revalidatePath(`/admin/users/${userId}`);
  }
  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <Link
            href="/admin/users"
            aria-label="Back to users"
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
          title="Edit user"
          subtitle="Update account details and keg management access."
        />

        <section
          aria-label="User details"
          className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-white/5 p-5 sm:p-6"
        >
          <form action={updateUser} className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-white/80">Email</span>
              <input
                name="email"
                defaultValue={authUser.user?.email ?? ""}
                className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white outline-none transition focus:border-green-400/50"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-white/80">
                Username
              </span>
              <input
                name="username"
                defaultValue={profile?.username ?? ""}
                className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white outline-none transition focus:border-green-400/50"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-white/80">Membership role</span>
              <select
                name="membership_status"
                defaultValue={profile?.membership_status ?? "member"}
                className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white outline-none transition focus:border-green-400/50"
              >
                {MEMBERSHIP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {membershipLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-4">
              <input
                type="checkbox"
                name="can_manage_kegs"
                defaultChecked={profile?.can_manage_kegs === true}
                className="h-4 w-4 accent-green-600"
              />
              <span className="text-sm text-white/80">Can manage kegs</span>
            </label>

            <button
              type="submit"
              className="rounded-lg border border-green-400/30 bg-green-500/20 px-4 py-3 font-semibold text-green-200 transition hover:bg-green-500/30"
            >
              Save changes
            </button>
          </form>

          <DeleteUserButton
            userId={userId}
            username={profile?.username ?? authUser.user?.email ?? userId}
          />
        </section>
      </div>
    </main>
  );
}
