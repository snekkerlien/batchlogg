import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { isMembershipStatus } from "@/lib/auth/membership";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";
import { isPlanTier } from "@/lib/auth/plan";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!hasPermission(await getMembershipRole(supabase, user), "manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (
    !email ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !username ||
    username.length > 64 ||
    !isMembershipStatus(body.membershipStatus) ||
    !isPlanTier(body.accountTier) ||
    typeof body.canManageKegs !== "boolean" ||
    typeof body.snusIsTrue !== "boolean"
  ) {
    return NextResponse.json({ error: "Enter valid account details" }, { status: 400 });
  }

  const { data: targetUser, error: targetUserError } =
    await serviceRole.auth.admin.getUserById(params.id);
  if (targetUserError) {
    console.error("Could not load user for admin update", targetUserError);
    return NextResponse.json({ error: "Could not load user" }, { status: 500 });
  }
  if (!targetUser.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const usernamePattern = username.replace(/[\\%_*]/g, "\\$&");
  const { data: matchingProfiles, error: lookupError } = await serviceRole
    .from("profiles")
    .select("id")
    .ilike("username", usernamePattern)
    .neq("id", params.id)
    .limit(1);
  if (lookupError) {
    console.error("Could not check admin username availability", lookupError);
    return NextResponse.json({ error: "Could not check username availability" }, { status: 500 });
  }
  if (matchingProfiles.length > 0) {
    return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
  }

  const { error: profileUpdateError } = await serviceRole
    .from("profiles")
    .update({
      username,
      membership_status: body.membershipStatus,
      account_tier: body.accountTier,
      premium_grant_source: body.accountTier === "premium" ? "manual" : null,
      can_manage_kegs: body.canManageKegs,
      snus_is_true: body.snusIsTrue,
    })
    .eq("id", params.id);
  if (profileUpdateError) {
    console.error("Could not update admin user profile", profileUpdateError);
    return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
  }

  const { error: authUpdateError } = await serviceRole.auth.admin.updateUserById(params.id, {
    email,
    email_confirm: true,
  });
  if (authUpdateError) {
    console.error("Profile was updated but user email could not be changed", authUpdateError);
    return NextResponse.json(
      { error: "Profile was updated, but email could not be changed" },
      { status: 500 }
    );
  }

  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "user.updated",
      targetType: "user",
      targetId: params.id,
      details: {
        membership_status: body.membershipStatus,
        account_tier: body.accountTier,
        updated_fields: "email,username,membership_status,account_tier,can_manage_kegs,snus_is_true",
      },
    }))
  ) {
    return NextResponse.json(
      { error: "User account was updated, but the audit log could not be updated." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, username });
}
