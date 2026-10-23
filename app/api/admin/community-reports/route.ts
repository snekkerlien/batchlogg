import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize(permission: "review_reports" | "delete_reported_content" = "review_reports") {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  if (!hasPermission(await getMembershipRole(supabase, user), permission)) {
    return null;
  }
  return { user, serviceRole };
}

export async function GET() {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: reports, error } = await context.serviceRole
    .from("community_reports")
    .select("id, reporter_id, reported_user_id, message_id, reason, status, content_type, content_id, category, context_url, content_snapshot, attachments, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("Could not load community reports", error);
    return NextResponse.json({ error: "Could not load reports" }, { status: 500 });
  }

  const rows = reports ?? [];
  const profileIds = [...new Set(rows.flatMap((report) => [report.reporter_id, report.reported_user_id]))];
  const messageIds = rows.flatMap((report) => report.message_id ? [report.message_id] : []);
  const reportIds = rows.map((report) => report.id);
  const reportedUserIds = [...new Set(rows.map((report) => report.reported_user_id))];
  const [
    { data: profiles, error: profilesError },
    { data: messages, error: messagesError },
    { data: history, error: historyError },
    { data: reportCounts, error: reportCountsError },
    { data: priorActions, error: priorActionsError },
    { data: activeRestrictions, error: activeRestrictionsError },
  ] =
    await Promise.all([
      profileIds.length
        ? context.serviceRole.from("profiles").select("id, username").in("id", profileIds)
        : { data: [], error: null },
      messageIds.length
        ? context.serviceRole.from("community_messages").select("id, body").in("id", messageIds)
        : { data: [], error: null },
      reportIds.length
        ? context.serviceRole
            .from("community_report_history")
            .select("id, report_id, actor_id, previous_status, new_status, created_at")
            .in("report_id", reportIds)
            .order("created_at", { ascending: false })
        : { data: [], error: null },
      reportedUserIds.length
        ? context.serviceRole.rpc("community_report_counts", {
            p_user_ids: reportedUserIds,
          })
        : { data: [], error: null },
      reportedUserIds.length
        ? context.serviceRole
            .from("admin_audit_log")
            .select("id, actor_id, action, target_id, details, created_at")
            .eq("target_type", "user")
            .in("target_id", reportedUserIds)
            .in("action", [
              "user.restriction_applied",
              "user.restriction_removed",
              "forum.content_removed",
              "community_report.content_removed",
            ])
            .order("created_at", { ascending: false })
            .limit(500)
        : { data: [], error: null },
      reportedUserIds.length
        ? context.serviceRole
            .from("user_restrictions")
            .select("user_id, restriction_type, starts_at, ends_at, reason")
            .in("user_id", reportedUserIds)
            .is("revoked_at", null)
            .lte("starts_at", new Date().toISOString())
            .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        : { data: [], error: null },
    ]);
  if (
    profilesError ||
    messagesError ||
    historyError ||
    reportCountsError ||
    priorActionsError ||
    activeRestrictionsError
  ) {
    console.error(
      "Could not load community report details",
      profilesError ||
        messagesError ||
        historyError ||
        reportCountsError ||
        priorActionsError ||
        activeRestrictionsError
    );
    return NextResponse.json({ error: "Could not load report details" }, { status: 500 });
  }

  const evidenceByReport = await Promise.all(
    rows.map(async (report) => {
      const paths = Array.isArray(report.attachments)
        ? report.attachments.filter(
            (path): path is string =>
              typeof path === "string" && path.startsWith(`${report.reporter_id}/`)
          )
        : [];
      const signedEvidence = await Promise.all(
        paths.map(async (path) => {
          const { data, error: signedUrlError } = await context.serviceRole.storage
            .from("community-report-evidence")
            .createSignedUrl(path, 60);
          return {
            path,
            url: data?.signedUrl ?? null,
            error: signedUrlError,
          };
        })
      );
      const failed = signedEvidence.find((evidence) => evidence.error);
      if (failed?.error) {
        console.error("Could not create report evidence link", failed.error);
        return { reportId: report.id, attachments: null };
      }
      return {
        reportId: report.id,
        attachments: signedEvidence.flatMap((evidence) =>
          evidence.url ? [{ path: evidence.path, url: evidence.url }] : []
        ),
      };
    })
  );
  const evidenceByReportId = new Map(
    evidenceByReport.map((entry) => [entry.reportId, entry.attachments])
  );
  if (evidenceByReport.some((entry) => entry.attachments === null)) {
    return NextResponse.json({ error: "Could not load report evidence" }, { status: 500 });
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const messagesById = new Map((messages ?? []).map((message) => [message.id, message]));
  const relatedActionActorIds = [
    ...new Set([
      ...(priorActions ?? []).flatMap((event) =>
        typeof event.actor_id === "string" ? [event.actor_id] : []
      ),
      ...(history ?? []).flatMap((event) =>
        typeof event.actor_id === "string" ? [event.actor_id] : []
      ),
    ]),
  ].filter((actorId) => !profilesById.has(actorId));
  const { data: relatedActionActors, error: relatedActionActorsError } =
    relatedActionActorIds.length
      ? await context.serviceRole
          .from("profiles")
          .select("id, username")
          .in("id", relatedActionActorIds)
      : { data: [], error: null };
  if (relatedActionActorsError) {
    console.error("Could not load moderation action names", relatedActionActorsError);
    return NextResponse.json({ error: "Could not load moderation history" }, { status: 500 });
  }
  for (const profile of relatedActionActors ?? []) {
    profilesById.set(profile.id, profile);
  }
  const actionsByUser = new Map<string, typeof priorActions>();
  for (const event of priorActions ?? []) {
    if (!event.target_id) continue;
    actionsByUser.set(event.target_id, [
      ...(actionsByUser.get(event.target_id) ?? []),
      event,
    ]);
  }
  const restrictionsByUser = new Map<string, typeof activeRestrictions>();
  for (const restriction of activeRestrictions ?? []) {
    restrictionsByUser.set(restriction.user_id, [
      ...(restrictionsByUser.get(restriction.user_id) ?? []),
      restriction,
    ]);
  }
  const reportCountByUser = new Map<string, number>(
    (reportCounts ?? []).map(
      (item: { reported_user_id: string; report_count: number | string }) => [
        item.reported_user_id,
        Number(item.report_count),
      ]
    )
  );
  return NextResponse.json({
    reports: rows.map((report) => ({
      ...report,
      reporter: profilesById.get(report.reporter_id)?.username || "Deleted user",
      reported: profilesById.get(report.reported_user_id)?.username || "Deleted user",
      totalReportsAgainstUser: reportCountByUser.get(report.reported_user_id) ?? 0,
      reportedMessage: report.message_id
        ? messagesById.get(report.message_id)?.body || "(message no longer available)"
        : [
            typeof report.content_snapshot?.title === "string"
              ? `Title: ${report.content_snapshot.title}`
              : null,
            typeof report.content_snapshot?.body === "string"
              ? report.content_snapshot.body
              : typeof report.content_snapshot?.name === "string"
                ? report.content_snapshot.name
                : typeof report.content_snapshot?.username === "string"
                  ? `Profile: @${report.content_snapshot.username}`
                  : null,
          ]
            .filter((part): part is string => part !== null)
            .join("\n\n") || null,
      attachments: evidenceByReportId.get(report.id) ?? [],
      priorReports: rows
        .filter((previous) =>
          previous.reported_user_id === report.reported_user_id &&
          previous.id !== report.id &&
          new Date(previous.created_at).getTime() < new Date(report.created_at).getTime()
        )
        .slice(0, 5)
        .map((previous) => ({
          id: previous.id,
          content_type: previous.content_type,
          status: previous.status,
          reason: previous.reason,
          created_at: previous.created_at,
        })),
      priorActions: (actionsByUser.get(report.reported_user_id) ?? []).map((event) => ({
        id: event.id,
        action: event.action,
        details: event.details,
        actor: event.actor_id
          ? profilesById.get(event.actor_id)?.username || "Administrator"
          : "Administrator",
        created_at: event.created_at,
      })),
      activeRestrictions: (restrictionsByUser.get(report.reported_user_id) ?? []).map(
        (restriction) => ({
          restriction_type: restriction.restriction_type,
          starts_at: restriction.starts_at,
          ends_at: restriction.ends_at,
          reason: restriction.reason,
        })
      ),
      history: (history ?? [])
        .filter((event) => event.report_id === report.id)
        .map((event) => ({
          ...event,
          actor: event.actor_id
            ? profilesById.get(event.actor_id)?.username || "Administrator"
            : "Administrator",
        })),
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (
    typeof body.id !== "string" ||
    !UUID_PATTERN.test(body.id) ||
    (body.status !== "open" &&
      body.status !== "under_review" &&
      body.status !== "action_taken" &&
      body.status !== "closed")
  ) {
    return NextResponse.json({ error: "Invalid report update" }, { status: 400 });
  }

  const { data: updated, error } = await context.serviceRole.rpc(
    "moderate_community_report",
    {
      p_report_id: body.id,
      p_actor_id: context.user.id,
      p_status: body.status,
    }
  );
  if (error) {
    console.error("Could not update community report", error);
    return NextResponse.json({ error: "Could not update report" }, { status: 500 });
  }
  if (!updated) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (
    !(await writeAdminAuditEvent(context.serviceRole, {
      actorId: context.user.id,
      action: "community_report.status_updated",
      targetType: "community_report",
      targetId: body.id,
      details: { status: body.status },
    }))
  ) {
    return NextResponse.json(
      { error: "Report status was updated, but the audit log could not be updated." },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const context = await authorize("delete_reported_content");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.id !== "string" || !UUID_PATTERN.test(body.id)) {
    return NextResponse.json({ error: "Invalid report identifier" }, { status: 400 });
  }

  const { data: removed, error } = await context.serviceRole.rpc(
    "moderate_reported_content",
    {
      p_report_id: body.id,
      p_actor_id: context.user.id,
    }
  );
  if (error) {
    if (error.code === "22023") {
      return NextResponse.json({ error: "This content type cannot be removed here" }, { status: 400 });
    }
    console.error("Could not remove reported content", error);
    return NextResponse.json({ error: "Could not remove reported content" }, { status: 500 });
  }
  if (!removed) {
    return NextResponse.json(
      { error: "The report or reported content no longer exists" },
      { status: 404 }
    );
  }
  if (
    !(await writeAdminAuditEvent(context.serviceRole, {
      actorId: context.user.id,
      action: "community_report.content_removed",
      targetType: "community_report",
      targetId: body.id,
    }))
  ) {
    return NextResponse.json(
      { error: "Reported content was removed, but the audit log could not be updated." },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
