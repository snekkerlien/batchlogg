import { NextRequest, NextResponse } from "next/server";
import type { MembershipRole } from "@/lib/auth/permissions";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

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
    return {
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  let role: MembershipRole;
  try {
    role = await getMembershipRole(supabase, user);
  } catch (permissionError) {
    console.error("Could not verify moderator permissions", permissionError);
    return {
      response: NextResponse.json({ error: "Could not verify permissions" }, { status: 503 }),
    };
  }
  if (!hasPermission(role, "moderate_community_members")) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, role, serviceRole };
}

export async function GET(request: NextRequest) {
  const context = await authorize();
  if ("response" in context) return context.response;

  if (request.nextUrl.searchParams.get("view") === "appeals") {
    const { data: appeals, error } = await context.serviceRole
      .from("community_report_appeals")
      .select("id, report_id, action_id, appellant_id, appeal_text, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) {
      console.error("Could not load pending moderation appeals", error);
      return NextResponse.json({ error: "Could not load pending appeals" }, { status: 500 });
    }

    const rows = appeals ?? [];
    const actionIds = [...new Set(rows.map((appeal) => appeal.action_id))];
    const memberIds = [...new Set(rows.map((appeal) => appeal.appellant_id))];
    const [
      { data: actions, error: actionsError },
      { data: profiles, error: profilesError },
    ] = await Promise.all([
      actionIds.length
        ? context.serviceRole
            .from("community_moderation_actions")
            .select("id, actor_id, action_type, reason, user_id")
            .in("id", actionIds)
        : { data: [], error: null },
      memberIds.length
        ? context.serviceRole.from("profiles").select("id, username, membership_status").in("id", memberIds)
        : { data: [], error: null },
    ]);
    if (actionsError || profilesError) {
      console.error("Could not load pending appeal details", actionsError || profilesError);
      return NextResponse.json({ error: "Could not load pending appeal details" }, { status: 500 });
    }

    const actors = [...new Set((actions ?? []).flatMap((action) => action.actor_id ? [action.actor_id] : []))];
    const { data: actorProfiles, error: actorProfilesError } = actors.length
      ? await context.serviceRole.from("profiles").select("id, username, membership_status").in("id", actors)
      : { data: [], error: null };
    if (actorProfilesError) {
      console.error("Could not load original moderation actors", actorProfilesError);
      return NextResponse.json({ error: "Could not load appeal context" }, { status: 500 });
    }

    const actionsById = new Map((actions ?? []).map((action) => [action.id, action]));
    const profilesById = new Map(
      [...(profiles ?? []), ...(actorProfiles ?? [])].map((profile) => [profile.id, profile])
    );
    return NextResponse.json({
      appeals: rows.map((appeal) => {
        const action = actionsById.get(appeal.action_id);
        const actor = action?.actor_id ? profilesById.get(action.actor_id) : null;
        return {
          ...appeal,
          appellant: profilesById.get(appeal.appellant_id)?.username || "Member",
          actionType: action?.action_type ?? "moderation action",
          actionReason: action?.reason ?? "",
          originalActorId: action?.actor_id ?? null,
          originalActorRole: actor?.membership_status ?? "member",
          originalActor: actor?.username || "Moderator",
          canReview:
            action?.actor_id !== context.user.id &&
            (
              context.role === "admin" ||
              context.role === "developer" ||
              actor?.membership_status === "member"
            ),
        };
      }),
    });
  }

  const rawQuery = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (rawQuery.length < 2 || rawQuery.length > 50) {
    return NextResponse.json({ members: [] });
  }
  const safeQuery = rawQuery.replace(/[\\%_]/g, "\\$&");
  const { data: members, error } = await context.serviceRole
    .from("profiles")
    .select("id, username")
    .eq("membership_status", "member")
    .ilike("username", `%${safeQuery}%`)
    .order("username")
    .limit(20);
  if (error) {
    console.error("Could not search community members for moderation", error);
    return NextResponse.json({ error: "Could not search members" }, { status: 500 });
  }

  const memberIds = (members ?? []).map((member) => member.id);
  const now = new Date().toISOString();
  const { data: restrictions, error: restrictionsError } = memberIds.length
    ? await context.serviceRole
        .from("user_restrictions")
        .select("user_id, ends_at, reason")
        .in("user_id", memberIds)
        .eq("restriction_type", "mute")
        .is("revoked_at", null)
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
    : { data: [], error: null };
  if (restrictionsError) {
    console.error("Could not load active member restrictions", restrictionsError);
    return NextResponse.json({ error: "Could not load member restrictions" }, { status: 500 });
  }
  const mutesByUser = new Map((restrictions ?? []).map((restriction) => [restriction.user_id, restriction]));
  return NextResponse.json({
    members: (members ?? []).map((member) => ({
      ...member,
      activeMute: mutesByUser.get(member.id) ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const context = await authorize();
  if ("response" in context) return context.response;

  let body: {
    memberId?: unknown;
    action?: unknown;
    reason?: unknown;
    durationDays?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (
    typeof body.memberId !== "string" ||
    !UUID_PATTERN.test(body.memberId) ||
    (body.action !== "warning" && body.action !== "mute") ||
    typeof body.reason !== "string" ||
    body.reason.trim().length < 3 ||
    body.reason.trim().length > 500 ||
    (body.action === "mute" &&
      (typeof body.durationDays !== "number" ||
        !Number.isInteger(body.durationDays) ||
        body.durationDays < 1 ||
        body.durationDays > 14))
  ) {
    return NextResponse.json({ error: "Invalid moderation action" }, { status: 400 });
  }

  const { data: target, error: targetError } = await context.serviceRole
    .from("profiles")
    .select("id, membership_status")
    .eq("id", body.memberId)
    .maybeSingle();
  if (targetError) {
    console.error("Could not verify moderation target", targetError);
    return NextResponse.json({ error: "Could not verify member" }, { status: 500 });
  }
  if (!target || target.membership_status !== "member") {
    return NextResponse.json({ error: "Moderation actions are limited to regular members." }, { status: 403 });
  }

  const now = new Date();
  const reason = body.reason.trim();
  const endsAt =
    body.action === "mute"
      ? new Date(now.getTime() + Number(body.durationDays) * 24 * 60 * 60 * 1000)
      : null;

  if (body.action === "mute") {
    const { data: activeMute, error: activeMuteError } = await context.serviceRole
      .from("user_restrictions")
      .select("user_id")
      .eq("user_id", target.id)
      .eq("restriction_type", "mute")
      .is("revoked_at", null)
      .lte("starts_at", now.toISOString())
      .or(`ends_at.is.null,ends_at.gt.${now.toISOString()}`)
      .maybeSingle();
    if (activeMuteError) {
      console.error("Could not check existing member mute", activeMuteError);
      return NextResponse.json({ error: "Could not check current restrictions" }, { status: 500 });
    }
    if (activeMute) return NextResponse.json({ error: "This member already has an active posting mute." }, { status: 409 });

    const { error } = await context.serviceRole.from("user_restrictions").upsert(
      {
        user_id: target.id,
        restriction_type: "mute",
        starts_at: now.toISOString(),
        ends_at: endsAt?.toISOString() ?? null,
        reason,
        created_by: context.user.id,
        revoked_at: null,
        revoked_by: null,
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id,restriction_type" }
    );
    if (error) {
      console.error("Could not apply standalone community mute", error);
      return NextResponse.json({ error: "Could not apply posting mute" }, { status: 500 });
    }
  }

  const { data: action, error: actionError } = await context.serviceRole
    .from("community_moderation_actions")
    .insert({
      report_id: null,
      user_id: target.id,
      actor_id: context.user.id,
      action_type: body.action,
      reason,
      restriction_ends_at: endsAt?.toISOString() ?? null,
    })
    .select("id")
    .single();
  if (actionError) {
    console.error("Moderation action was applied but its history could not be recorded", actionError);
    return NextResponse.json({ error: "Action was applied, but its history could not be recorded." }, { status: 500 });
  }
  if (
    !(await writeAdminAuditEvent(context.serviceRole, {
      actorId: context.user.id,
      action: body.action === "mute" ? "user.restriction_applied" : "user.warning_issued",
      targetType: "user",
      targetId: target.id,
      details: {
        restriction_type: body.action === "mute" ? "mute" : null,
        reason,
        restriction_ends_at: endsAt?.toISOString() ?? null,
        moderation_action_id: action.id,
      },
    }))
  ) {
    return NextResponse.json({ error: "Action was applied, but the audit log could not be updated." }, { status: 500 });
  }
  return NextResponse.json({ success: true, actionId: action.id });
}

export async function PATCH(request: NextRequest) {
  const context = await authorize();
  if ("response" in context) return context.response;

  let body: {
    appealId?: unknown;
    status?: unknown;
    resolutionNote?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (
    typeof body.appealId !== "string" ||
    !UUID_PATTERN.test(body.appealId) ||
    (body.status !== "upheld" && body.status !== "overturned") ||
    typeof body.resolutionNote !== "string" ||
    body.resolutionNote.trim().length < 3 ||
    body.resolutionNote.trim().length > 1000
  ) {
    return NextResponse.json({ error: "Invalid appeal decision" }, { status: 400 });
  }

  const { data: appeal, error: appealError } = await context.serviceRole
    .from("community_report_appeals")
    .select("id, report_id, action_id, appellant_id")
    .eq("id", body.appealId)
    .eq("status", "pending")
    .maybeSingle();
  if (appealError) {
    console.error("Could not verify moderation appeal", appealError);
    return NextResponse.json({ error: "Could not verify appeal" }, { status: 500 });
  }
  if (!appeal) return NextResponse.json({ error: "Pending appeal not found" }, { status: 404 });

  const { data: action, error: actionError } = await context.serviceRole
    .from("community_moderation_actions")
    .select("actor_id, user_id, action_type")
    .eq("id", appeal.action_id)
    .maybeSingle();
  if (actionError) {
    console.error("Could not load appealed action", actionError);
    return NextResponse.json({ error: "Could not verify original moderation action" }, { status: 500 });
  }
  if (
    !action ||
    action.user_id !== appeal.appellant_id ||
    (action.action_type !== "warning" && action.action_type !== "mute")
  ) {
    return NextResponse.json({ error: "Appeal is not attached to an eligible moderation action." }, { status: 409 });
  }
  if (action.actor_id === context.user.id) {
    return NextResponse.json({ error: "A moderator cannot review their own decision." }, { status: 403 });
  }
  if (context.role === "moderator") {
    if (!action.actor_id) {
      return NextResponse.json({ error: "An administrator must review this appeal." }, { status: 403 });
    }
    const { data: originalActor, error: originalActorError } = await context.serviceRole
      .from("profiles")
      .select("membership_status")
      .eq("id", action.actor_id)
      .maybeSingle();
    if (originalActorError) {
      console.error("Could not check original moderator role", originalActorError);
      return NextResponse.json({ error: "Could not verify original moderation role" }, { status: 500 });
    }
    if (originalActor?.membership_status !== "member") {
      return NextResponse.json({ error: "An administrator must review this appeal." }, { status: 403 });
    }
  }

  const { data, error } = await context.serviceRole.rpc("resolve_community_report_appeal", {
    p_appeal_id: appeal.id,
    p_report_id: appeal.report_id,
    p_actor_id: context.user.id,
    p_status: body.status,
    p_resolution_note: body.resolutionNote.trim(),
  });
  if (error) {
    console.error("Could not resolve standalone moderation appeal", error);
    return NextResponse.json({ error: "Could not resolve appeal" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Pending appeal no longer exists" }, { status: 404 });

  const auditWritten = await writeAdminAuditEvent(context.serviceRole, {
    actorId: context.user.id,
    action: `community_report.appeal_${body.status}`,
    targetType: appeal.report_id ? "community_report" : "user",
    targetId: appeal.report_id ?? appeal.appellant_id,
    details: { appeal_id: appeal.id, action_id: appeal.action_id },
  });
  if (!auditWritten) {
    return NextResponse.json({ error: "Appeal was resolved, but the audit log could not be updated." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
