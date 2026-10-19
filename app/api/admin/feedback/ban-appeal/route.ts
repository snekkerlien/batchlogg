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
  } catch {
    return NextResponse.json({ error: "Could not verify admin permissions." }, { status: 503 });
  }
  if (!hasPermission(role, "manage_users")) {
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
  const feedbackId = "feedbackId" in body ? body.feedbackId : undefined;
  const action = "action" in body ? body.action : undefined;
  if (
    typeof feedbackId !== "string" ||
    !UUID_PATTERN.test(feedbackId) ||
    (action !== "dismiss" && action !== "grant")
  ) {
    return NextResponse.json({ error: "Invalid appeal action" }, { status: 400 });
  }

  const { data: appeal, error: appealError } = await serviceRole
    .from("feedback")
    .select("id, user_id, category")
    .eq("id", feedbackId)
    .eq("category", "ban_appeal")
    .maybeSingle();
  if (appealError) {
    console.error("Could not load ban appeal", appealError);
    return NextResponse.json({ error: "Could not load ban appeal." }, { status: 500 });
  }
  if (!appeal) {
    return NextResponse.json({ error: "Ban appeal not found." }, { status: 404 });
  }
  if (!appeal.user_id) {
    return NextResponse.json(
      { error: "This appeal is not linked to an account." },
      { status: 409 }
    );
  }

  if (action === "grant") {
    const revokedAt = new Date().toISOString();
    const { data: revoked, error: revokeError } = await serviceRole
      .from("user_restrictions")
      .update({
        revoked_at: revokedAt,
        revoked_by: user.id,
        updated_at: revokedAt,
      })
      .eq("user_id", appeal.user_id)
      .eq("restriction_type", "ban")
      .is("revoked_at", null)
      .lte("starts_at", revokedAt)
      .or(`ends_at.is.null,ends_at.gt.${revokedAt}`)
      .select("user_id");
    if (revokeError) {
      console.error("Could not grant ban appeal", revokeError);
      return NextResponse.json({ error: "Could not remove the user's ban." }, { status: 500 });
    }
    if (!revoked?.length) {
      return NextResponse.json(
        { error: "This user no longer has an active ban. The appeal was left in the inbox." },
        { status: 409 }
      );
    }

    if (
      !(await writeAdminAuditEvent(serviceRole, {
        actorId: user.id,
        action: "user.restriction_removed",
        targetType: "user",
        targetId: appeal.user_id,
        details: { restriction_type: "ban", source: "ban_appeal" },
      }))
    ) {
      return NextResponse.json(
        { error: "The ban was removed, but the audit log could not be updated." },
        { status: 500 }
      );
    }
  }

  const { error: deleteError } = await serviceRole
    .from("feedback")
    .delete()
    .eq("id", appeal.id)
    .eq("category", "ban_appeal");
  if (deleteError) {
    console.error("Appeal was resolved but could not be removed from feedback", deleteError);
    return NextResponse.json(
      {
        error:
          action === "grant"
            ? "The ban was removed, but the appeal could not be removed from the inbox."
            : "Could not dismiss the appeal.",
      },
      { status: 500 }
    );
  }

  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: action === "grant" ? "feedback.ban_appeal_granted" : "feedback.ban_appeal_dismissed",
      targetType: "feedback",
      targetId: appeal.id,
      details: { user_id: appeal.user_id },
    }))
  ) {
    return NextResponse.json(
      { error: "The appeal was resolved, but the audit log could not be updated." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
