import { MEMBERSHIP_STATUSES, isMembershipStatus, membershipLabel } from "@/lib/auth/membership";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { supabaseServer } from "../../../../lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";
import { isPlanTier } from "@/lib/auth/plan";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import UserRestrictionControls from "@/app/components/UserRestrictionControls";
import DeleteUserButton from "./DeleteUserButton";
import {
  BUSINESS_TYPES,
  isBusinessType,
} from "@/lib/brewery/business";
import {
  slugifyBreweryValue,
  normalizeOptionalUrl,
} from "@/lib/brewery/access";

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

  const now = new Date().toISOString();
  const { data: restrictions, error: restrictionsError } = await serviceRole
    .from("user_restrictions")
    .select("user_id, restriction_type, starts_at, ends_at, reason")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`);
  if (restrictionsError) {
    throw new Error(`Failed to load user restrictions: ${restrictionsError.message}`);
  }

  const { data: businessAccount, error: businessAccountError } = await serviceRole
    .from("brewery_accounts")
    .select("id, name, business_type, business_type_other, slug, status, manual_access_granted_at, manual_access_expires_at, manual_access_note, stripe_subscription_status")
    .eq("owner_id", userId)
    .maybeSingle();
  if (businessAccountError) {
    throw new Error(`Failed to load user's business account: ${businessAccountError.message}`);
  }

  async function grantBusinessAccess(formData: FormData) {
    "use server";

    const { supabase: actionSupabase, serviceRole: actionServiceRole } =
      supabaseServer();
    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();
    if (!actionUser) throw new Error("Forbidden");
    const actionRole = await getMembershipRole(actionSupabase, actionUser);
    if (!hasPermission(actionRole, "manage_users")) throw new Error("Forbidden");

    const name = formData.get("business_name")?.toString().trim() ?? "";
    const businessType = formData.get("business_type")?.toString();
    const businessTypeOther =
      formData.get("business_type_other")?.toString().trim() ?? "";
    const description = formData.get("business_description")?.toString().trim() ?? "";
    const location = formData.get("business_location")?.toString().trim() ?? "";
    const websiteValue = formData.get("business_website")?.toString() ?? "";
    const websiteUrl = normalizeOptionalUrl(websiteValue);
    const note = formData.get("grant_note")?.toString().trim() ?? "";
    const expiryValue = formData.get("grant_expires_at")?.toString() ?? "";
    const expiresAt = expiryValue ? new Date(expiryValue) : null;

    if (
      name.length < 2 ||
      name.length > 120 ||
      !isBusinessType(businessType) ||
      (businessType === "other" &&
        (businessTypeOther.length < 2 || businessTypeOther.length > 100)) ||
      description.length > 5000 ||
      location.length > 200 ||
      websiteUrl === undefined ||
      note.length > 1000 ||
      (expiryValue &&
        (!expiresAt || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()))
    ) {
      throw new Error("Check the business details and free-access grant settings.");
    }

    const { data: existingAccount, error: existingError } = await actionServiceRole
      .from("brewery_accounts")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (existingError) {
      throw new Error(`Failed to check for an existing business page: ${existingError.message}`);
    }
    if (existingAccount) {
      throw new Error("This user already has a business account. Use the controls below to grant access.");
    }

    const slug = slugifyBreweryValue(name);
    if (!slug) throw new Error("Enter a business name that can be used in a public link.");
    const now = new Date().toISOString();
    const { data: createdAccount, error: createError } = await actionServiceRole
      .from("brewery_accounts")
      .insert({
        owner_id: userId,
        name,
        business_type: businessType,
        business_type_other: businessType === "other" ? businessTypeOther : null,
        slug,
        description,
        location,
        website_url: websiteUrl,
        status: "approved",
        approved_by: actionUser.id,
        approved_at: now,
        manual_access_granted_by: actionUser.id,
        manual_access_granted_at: now,
        manual_access_expires_at: expiresAt?.toISOString() ?? null,
        manual_access_note: note || null,
      })
      .select("id")
      .single();
    if (createError) {
      if (createError.code === "23505") {
        throw new Error("A business with that name or page address already exists.");
      }
      throw new Error(`Failed to create business account: ${createError.message}`);
    }

    if (
      !(await writeAdminAuditEvent(actionServiceRole, {
        actorId: actionUser.id,
        action: "business.manual_account_created",
        targetType: "brewery",
        targetId: createdAccount.id,
        details: {
          name,
          business_type: businessType,
          owner_id: userId,
          expires_at: expiresAt?.toISOString() ?? null,
          note: note || null,
        },
      }))
    ) {
      throw new Error("Business account was created, but the audit log could not be updated.");
    }

    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/breweries");
    revalidatePath("/business");
  }

  async function updateBusinessGrant(formData: FormData) {
    "use server";

    const action = formData.get("business_grant_action")?.toString();
    if (action !== "grant" && action !== "revoke") {
      throw new Error("Invalid business access action.");
    }
    const note = formData.get("business_grant_note")?.toString().trim() ?? "";
    const expiryValue = formData.get("business_grant_expires_at")?.toString() ?? "";
    const expiresAt = expiryValue ? new Date(expiryValue) : null;
    if (
      note.length > 1000 ||
      (expiryValue &&
        (!expiresAt ||
          !Number.isFinite(expiresAt.getTime()) ||
          expiresAt.getTime() <= Date.now()))
    ) {
      throw new Error("Enter a valid future expiration date and grant note.");
    }
    const { supabase: actionSupabase, serviceRole: actionServiceRole } =
      supabaseServer();
    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();
    if (!actionUser) throw new Error("Forbidden");
    const actionRole = await getMembershipRole(actionSupabase, actionUser);
    if (!hasPermission(actionRole, "manage_users")) throw new Error("Forbidden");

    const { data: targetAccount, error: targetError } = await actionServiceRole
      .from("brewery_accounts")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (targetError) throw new Error(`Failed to load business account: ${targetError.message}`);
    if (!targetAccount) throw new Error("This user does not have a business account.");

    const now = new Date().toISOString();
    const update: Record<string, string | null> =
      action === "grant"
        ? {
            status: "approved",
            approved_by: actionUser.id,
            approved_at: now,
            manual_access_granted_by: actionUser.id,
            manual_access_granted_at: now,
            manual_access_expires_at: expiresAt?.toISOString() ?? null,
            manual_access_note: note || "Granted from user administration",
          }
        : {
            manual_access_granted_by: null,
            manual_access_granted_at: null,
            manual_access_expires_at: null,
            manual_access_note: null,
          };
    const { error: updateError } = await actionServiceRole
      .from("brewery_accounts")
      .update(update)
      .eq("id", targetAccount.id);
    if (updateError) throw new Error(`Failed to update business access: ${updateError.message}`);
    if (
      !(await writeAdminAuditEvent(actionServiceRole, {
        actorId: actionUser.id,
        action: action === "grant" ? "business.access_granted" : "business.access_revoked",
        targetType: "brewery",
        targetId: targetAccount.id,
        details: { owner_id: userId },
      }))
    ) {
      throw new Error("Business access was updated, but the audit log could not be updated.");
    }
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/breweries");
    revalidatePath("/business");
  }

  async function updateUser(formData: FormData) {
    "use server";

    const { supabase: actionSupabase, serviceRole: actionServiceRole } =
      supabaseServer();
    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!actionUser) {
      throw new Error("Forbidden");
    }
    const actionRole = await getMembershipRole(actionSupabase, actionUser);
    if (!hasPermission(actionRole, "manage_users")) {
      throw new Error("Forbidden");
    }

    const email = formData.get("email")?.toString();
    const username = formData.get("username")?.toString();
    const canManageKegs = formData.get("can_manage_kegs") === "on";
    const snusIsTrue = formData.get("snus_is_true") === "on";
    const membershipStatus = formData.get("membership_status")?.toString();
    const accountTier = formData.get("account_tier")?.toString();

    if (
      !email ||
      !username ||
      !isMembershipStatus(membershipStatus) ||
      !isPlanTier(accountTier)
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
        snus_is_true: snusIsTrue,
        membership_status: membershipStatus,
        account_tier: accountTier,
        premium_grant_source: accountTier === "premium" ? "manual" : null,
      })
      .eq("id", userId);

    if (profileUpdateError) {
      throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
    }

    if (
      !(await writeAdminAuditEvent(actionServiceRole, {
        actorId: actionUser.id,
        action: "user.updated",
        targetType: "user",
        targetId: userId,
        details: {
          membership_status: membershipStatus,
          account_tier: accountTier,
          updated_fields: "email,username,membership_status,account_tier,can_manage_kegs,snus_is_true",
        },
      }))
    ) {
      throw new Error("User account was updated, but the audit log could not be updated.");
    }

    revalidatePath(`/admin/users/${userId}`);
  }
  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <BackButton />
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
              <span className="text-sm font-medium text-white/80">Plan tier</span>
              <select
                name="account_tier"
                defaultValue={profile?.account_tier ?? "free"}
                className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white outline-none transition focus:border-green-400/50"
              >
                <option value="free">Free</option>
                <option value="premium">Premium (manual grant)</option>
              </select>
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

            <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-4">
              <input
                type="checkbox"
                name="snus_is_true"
                defaultChecked={profile?.snus_is_true === true}
                className="h-4 w-4 accent-green-600"
              />
              <span className="text-sm text-white/80">Snus access</span>
            </label>

            <button
              type="submit"
              className="rounded-lg border border-green-400/30 bg-green-500/20 px-4 py-3 font-semibold text-green-200 transition hover:bg-green-500/30"
            >
              Save changes
            </button>
          </form>

          <section className="mt-8 rounded-xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-lg font-semibold text-green-200">Business account access</h2>
            {businessAccount ? (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="font-medium">{businessAccount.name}</p>
                  <p className="text-sm text-white/60">
                    {businessAccount.business_type === "other"
                      ? businessAccount.business_type_other || "Other"
                      : BUSINESS_TYPES.find((type) => type.value === businessAccount.business_type)?.label || "Business"}
                    {" · "}
                    <span className="capitalize">{businessAccount.status}</span>
                  </p>
                  <p className="text-sm text-white/50">
                    {businessAccount.stripe_subscription_status
                      ? `Stripe: ${businessAccount.stripe_subscription_status}`
                      : businessAccount.manual_access_granted_at
                        ? `Free access${businessAccount.manual_access_expires_at ? ` expires ${new Date(businessAccount.manual_access_expires_at).toLocaleString()}` : " (no expiry)"}`
                        : "No free-access grant"}
                  </p>
                  {businessAccount.manual_access_note && (
                    <p className="text-sm text-white/50">Grant note: {businessAccount.manual_access_note}</p>
                  )}
                  <Link
                    href={`/business/${businessAccount.slug}`}
                    className="mt-2 inline-block text-sm text-green-200 underline"
                  >
                    View public page
                  </Link>
                </div>
                <form action={updateBusinessGrant} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs text-white/60">
                      Grant note
                      <input
                        name="business_grant_note"
                        maxLength={1000}
                        defaultValue={businessAccount.manual_access_note ?? ""}
                        className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm text-white"
                      />
                    </label>
                    <label className="block text-xs text-white/60">
                      Optional grant expiration
                      <input
                        type="datetime-local"
                        name="business_grant_expires_at"
                        className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm text-white"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      name="business_grant_action"
                      value="grant"
                      type="submit"
                      className="rounded-lg border border-green-400/30 bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-600"
                    >
                      {businessAccount.manual_access_granted_at ? "Update free access" : "Grant free access"}
                    </button>
                    {businessAccount.manual_access_granted_at && (
                      <button
                        name="business_grant_action"
                        value="revoke"
                        type="submit"
                        className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
                      >
                        Revoke free access
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-white/45">
                    Free access approves the page and is managed separately from any Stripe subscription.
                  </p>
                </form>
              </div>
            ) : (
              <form action={grantBusinessAccess} className="mt-3 space-y-4">
                <p className="text-sm text-white/60">
                  Create and approve a business page with complimentary access for this user.
                </p>
                <label className="block">
                  <span className="text-sm text-white/80">Business name</span>
                  <input
                    name="business_name"
                    required
                    minLength={2}
                    maxLength={120}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-white/80">Business type</span>
                  <select
                    name="business_type"
                    defaultValue="brewery"
                    className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
                  >
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type.value} value={type.value} className="bg-zinc-900">
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm text-white/80">Custom business type (if Other)</span>
                  <input
                    name="business_type_other"
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
                    placeholder="e.g. tasting room"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-white/80">Description</span>
                  <textarea
                    name="business_description"
                    maxLength={5000}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm text-white/80">Location</span>
                    <input
                      name="business_location"
                      maxLength={200}
                      className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-white/80">Website URL</span>
                    <input
                      name="business_website"
                      type="text"
                      inputMode="url"
                      placeholder="homebrew.no"
                      className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-white/80">Optional grant note</span>
                    <input
                      name="grant_note"
                      maxLength={1000}
                      className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-white/80">Optional grant expiration</span>
                    <input
                      name="grant_expires_at"
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="rounded-lg border border-green-400/30 bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-600"
                >
                  Create page & grant free access
                </button>
              </form>
            )}
          </section>

          <DeleteUserButton
            userId={userId}
            username={profile?.username ?? authUser.user?.email ?? userId}
          />

          <UserRestrictionControls
            userId={userId}
            restrictions={restrictions ?? []}
          />
        </section>
      </div>
    </main>
  );
}
