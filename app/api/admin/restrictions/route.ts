import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (!hasPermission(await getMembershipRole(supabase, user), "manage_users")) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, serviceRole };
}

export async function GET() {
  const context = await authorize();
  if ("response" in context) return context.response;

  const { data: restrictions, error } = await context.serviceRole
    .from("user_restrictions")
    .select("user_id, restriction_type, starts_at, ends_at, reason, created_by")
    .is("revoked_at", null)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order("starts_at", { ascending: false });
  if (error) {
    console.error("Could not load user restrictions", error);
    return NextResponse.json({ error: "Could not load user restrictions" }, { status: 500 });
  }

  const userIds = [...new Set((restrictions ?? []).map((restriction) => restriction.user_id))];
  const { data: profiles, error: profilesError } = userIds.length
    ? await context.serviceRole
        .from("profiles")
        .select("id, username")
        .in("id", userIds)
    : { data: [], error: null };
  if (profilesError) {
    console.error("Could not load restricted user names", profilesError);
    return NextResponse.json({ error: "Could not load user restrictions" }, { status: 500 });
  }
  const usernames = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));

  return NextResponse.json({
    restrictions: (restrictions ?? []).map((restriction) => ({
      ...restriction,
      username: usernames.get(restriction.user_id) || "Community member",
    })),
  });
}

export async function POST(request: NextRequest) {
  const context = await authorize();
  if ("response" in context) return context.response;

  let body: {
    userId?: unknown;
    type?: unknown;
    durationDays?: unknown;
    reason?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.userId !== "string" ||
    !UUID_PATTERN.test(body.userId) ||
    (body.type !== "mute" && body.type !== "ban") ||
    (body.durationDays !== null &&
      (!Number.isInteger(body.durationDays) ||
        (body.durationDays as number) < 1 ||
        (body.durationDays as number) > 36500)) ||
    (body.reason !== undefined &&
      (typeof body.reason !== "string" || body.reason.trim().length > 500))
  ) {
    return NextResponse.json({ error: "Invalid restriction details" }, { status: 400 });
  }

  const { data: targetUser, error: targetUserError } =
    await context.serviceRole.auth.admin.getUserById(body.userId);
  if (targetUserError) {
    console.error("Could not verify restricted user", targetUserError);
    return NextResponse.json({ error: "Could not verify user" }, { status: 500 });
  }
  if (!targetUser.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const startsAt = new Date();
  const endsAt =
    body.durationDays === null
      ? null
      : new Date(startsAt.getTime() + (body.durationDays as number) * 24 * 60 * 60 * 1000);
  const { error } = await context.serviceRole.from("user_restrictions").upsert(
    {
      user_id: body.userId,
      restriction_type: body.type,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() ?? null,
      reason: typeof body.reason === "string" ? body.reason.trim() || null : null,
      created_by: context.user.id,
      revoked_at: null,
      revoked_by: null,
      updated_at: startsAt.toISOString(),
    },
    { onConflict: "user_id,restriction_type" }
  );
  if (error) {
    console.error("Could not apply user restriction", error);
    return NextResponse.json({ error: "Could not apply restriction" }, { status: 500 });
  }
  if (
    !(await writeAdminAuditEvent(context.serviceRole, {
      actorId: context.user.id,
      action: "user.restriction_applied",
      targetType: "user",
      targetId: body.userId,
      details: {
        restriction_type: body.type,
        duration_days: body.durationDays as number | null,
      },
    }))
  ) {
    return NextResponse.json(
      { error: "Restriction was applied, but the audit log could not be updated." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    restriction: {
      user_id: body.userId,
      restriction_type: body.type,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() ?? null,
      reason: typeof body.reason === "string" ? body.reason.trim() || null : null,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const context = await authorize();
  if ("response" in context) return context.response;

  let body: { userId?: unknown; type?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (
    typeof body.userId !== "string" ||
    !UUID_PATTERN.test(body.userId) ||
    (body.type !== "mute" && body.type !== "ban")
  ) {
    return NextResponse.json({ error: "Invalid restriction details" }, { status: 400 });
  }

  const revokedAt = new Date().toISOString();
  const { data, error } = await context.serviceRole
    .from("user_restrictions")
    .update({
      revoked_at: revokedAt,
      revoked_by: context.user.id,
      updated_at: revokedAt,
    })
    .eq("user_id", body.userId)
    .eq("restriction_type", body.type)
    .is("revoked_at", null)
    .select("user_id");
  if (error) {
    console.error("Could not remove user restriction", error);
    return NextResponse.json({ error: "Could not remove restriction" }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ error: "Active restriction not found" }, { status: 404 });
  }
  if (
    !(await writeAdminAuditEvent(context.serviceRole, {
      actorId: context.user.id,
      action: "user.restriction_removed",
      targetType: "user",
      targetId: body.userId,
      details: { restriction_type: body.type },
    }))
  ) {
    return NextResponse.json(
      { error: "Restriction was removed, but the audit log could not be updated." },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
