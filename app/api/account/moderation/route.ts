import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: actions, error } = await serviceRole
    .from("community_moderation_actions")
    .select("id, report_id, actor_id, action_type, reason, restriction_ends_at, created_at")
    .eq("user_id", user.id)
    .in("action_type", ["warning", "mute"])
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Could not load member moderation history", error);
    return NextResponse.json({ error: "Could not load moderation history" }, { status: 500 });
  }

  const actionIds = (actions ?? []).map((action) => action.id);
  const actorIds = [...new Set((actions ?? []).flatMap((action) => action.actor_id ? [action.actor_id] : []))];
  const [
    { data: appeals, error: appealsError },
    { data: actors, error: actorsError },
  ] = await Promise.all([
    actionIds.length
      ? serviceRole
          .from("community_report_appeals")
          .select("id, action_id, appeal_text, status, reviewed_at, resolution_note, created_at")
          .in("action_id", actionIds)
      : { data: [], error: null },
    actorIds.length
      ? serviceRole.from("profiles").select("id, username").in("id", actorIds)
      : { data: [], error: null },
  ]);
  if (appealsError || actorsError) {
    console.error("Could not load moderation appeal details", appealsError || actorsError);
    return NextResponse.json({ error: "Could not load moderation history" }, { status: 500 });
  }
  const actorNames = new Map((actors ?? []).map((actor) => [actor.id, actor.username]));
  const appealByAction = new Map((appeals ?? []).map((appeal) => [appeal.action_id, appeal]));

  return NextResponse.json({
    actions: (actions ?? []).map((action) => ({
      ...action,
      moderator: action.actor_id ? actorNames.get(action.actor_id) || "Moderator" : "Moderator",
      appeal: appealByAction.get(action.id) ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { actionId?: unknown; appealText?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (
    typeof body.actionId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.actionId) ||
    typeof body.appealText !== "string" ||
    body.appealText.trim().length < 10 ||
    body.appealText.trim().length > 3000
  ) {
    return NextResponse.json(
      { error: "Appeals must include between 10 and 3000 characters." },
      { status: 400 }
    );
  }

  const { data: action, error: actionError } = await serviceRole
    .from("community_moderation_actions")
    .select("id, report_id, user_id, action_type")
    .eq("id", body.actionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (actionError) {
    console.error("Could not verify member moderation action", actionError);
    return NextResponse.json({ error: "Could not submit appeal" }, { status: 500 });
  }
  if (!action || (action.action_type !== "warning" && action.action_type !== "mute")) {
    return NextResponse.json({ error: "This moderation action cannot be appealed." }, { status: 404 });
  }

  const { error } = await serviceRole.from("community_report_appeals").insert({
    report_id: action.report_id ?? null,
    action_id: action.id,
    appellant_id: user.id,
    appeal_text: body.appealText.trim(),
  });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "An appeal has already been submitted for this action." }, { status: 409 });
    }
    console.error("Could not save member moderation appeal", error);
    return NextResponse.json({ error: "Could not submit appeal" }, { status: 500 });
  }
  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "community_report.appeal_submitted",
      targetType: action.report_id ? "community_report" : "user",
      targetId: action.report_id ?? user.id,
      details: { action_id: action.id, report_id: action.report_id ?? null },
    }))
  ) {
    return NextResponse.json(
      { error: "Appeal was submitted, but its audit record could not be written." },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
