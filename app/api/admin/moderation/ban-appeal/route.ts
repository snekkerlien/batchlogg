import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let role;
  try {
    role = await getMembershipRole(supabase, user);
  } catch (error) {
    console.error("Could not verify ban appeal moderator permissions", error);
    return NextResponse.json({ error: "Could not verify moderator permissions." }, { status: 503 });
  }
  if (!hasPermission(role, "moderate_community_members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid appeal action" }, { status: 400 });
  }
  const appealUserId = "appealUserId" in body ? body.appealUserId : undefined;
  const action = "action" in body ? body.action : undefined;
  const message = "message" in body ? body.message : undefined;
  const requestMessage = typeof message === "string" ? message.trim() : "";
  if (
    typeof appealUserId !== "string" ||
    !UUID_PATTERN.test(appealUserId) ||
    (action !== "request_info" && action !== "grant" && action !== "dismiss") ||
    (action === "request_info" &&
      (requestMessage.length < 3 || requestMessage.length > 3000))
  ) {
    return NextResponse.json({ error: "Invalid appeal action or message." }, { status: 400 });
  }

  const { data: result, error } = await serviceRole.rpc("manage_ban_appeal", {
    p_user_id: appealUserId,
    p_actor_id: user.id,
    p_action: action,
    p_message: action === "request_info" ? requestMessage : null,
  });
  if (error) {
    console.error("Could not update ban appeal workflow", error);
    return NextResponse.json({ error: "Could not update the ban appeal." }, { status: 500 });
  }
  if (result === "not_found") {
    return NextResponse.json({ error: "Ban appeal not found." }, { status: 404 });
  }
  if (result === "no_active_ban") {
    return NextResponse.json(
      { error: "This user no longer has an active ban. The appeal was left unresolved." },
      { status: 409 }
    );
  }
  if (result === "already_resolved" || result === "already_requested") {
    return NextResponse.json(
      { error: "This appeal has changed since it was loaded. Refresh and try again." },
      { status: 409 }
    );
  }
  if (result !== "success") {
    return NextResponse.json({ error: "The appeal action or message is invalid." }, { status: 400 });
  }

  const auditAction =
    action === "request_info"
      ? "feedback.ban_appeal_info_requested"
      : action === "grant"
        ? "feedback.ban_appeal_granted"
        : "feedback.ban_appeal_dismissed";
  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: auditAction,
      targetType: "ban_appeal",
      targetId: appealUserId,
      details: { action },
    }))
  ) {
    return NextResponse.json(
      { error: "The appeal was updated, but the change could not be added to the audit log." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
