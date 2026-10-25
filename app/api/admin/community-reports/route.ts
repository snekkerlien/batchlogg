import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import {
  getMembershipRole,
  hasPermission,
  type MembershipRole,
  type Permission,
} from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize(permission: Permission = "review_reports") {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const role = await getMembershipRole(supabase, user);
  if (!hasPermission(role, permission)) {
    return null;
  }
  return { user, serviceRole, role };
}

async function recordModerationEvent(
  serviceRole: SupabaseClient,
  input: {
    reportId: string;
    userId: string;
    actorId: string;
    actionType:
      | "content_hidden"
      | "content_restored"
      | "escalation"
      | "note"
      | "assigned"
      | "unassigned"
      | "appeal_upheld"
      | "appeal_overturned";
    reason?: string | null;
  }
) {
  const { error } = await serviceRole.from("community_moderation_actions").insert({
    report_id: input.reportId,
    user_id: input.userId,
    actor_id: input.actorId,
    action_type: input.actionType,
    reason: input.reason || input.actionType.replaceAll("_", " "),
  });
  if (error) {
    console.error("Could not record community moderation event", error);
    return false;
  }
  return true;
}

async function checkReportAssignment(
  serviceRole: SupabaseClient,
  role: MembershipRole,
  userId: string,
  reportId: string
) {
  if (role === "admin") return null;
  const { data: report, error } = await serviceRole
    .from("community_reports")
    .select("id, assigned_to")
    .eq("id", reportId)
    .maybeSingle();
  if (error) {
    console.error("Could not verify report assignment", error);
    return NextResponse.json({ error: "Could not verify report assignment" }, { status: 500 });
  }
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (report.assigned_to && report.assigned_to !== userId) {
    return NextResponse.json(
      { error: "This report is assigned to another moderator." },
      { status: 409 }
    );
  }
  return null;
}

export async function GET() {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: reports, error } = await context.serviceRole
    .from("community_reports")
    .select("id, reporter_id, reported_user_id, message_id, reason, status, content_type, content_id, category, context_url, content_snapshot, attachments, assigned_to, moderator_notes, escalated_at, escalation_note, created_at")
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
    { data: moderationActions, error: moderationActionsError },
    { data: appeals, error: appealsError },
    { data: moderators, error: moderatorsError },
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
              "user.warning_issued",
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
      reportIds.length
        ? context.serviceRole
            .from("community_moderation_actions")
            .select("id, report_id, user_id, actor_id, action_type, reason, restriction_ends_at, created_at")
            .in("report_id", reportIds)
            .order("created_at", { ascending: false })
        : { data: [], error: null },
      reportIds.length
        ? context.serviceRole
            .from("community_report_appeals")
            .select("id, report_id, action_id, appellant_id, appeal_text, status, reviewed_by, reviewed_at, resolution_note, created_at")
            .in("report_id", reportIds)
            .order("created_at", { ascending: false })
        : { data: [], error: null },
      context.serviceRole
        .from("profiles")
        .select("id, username")
        .in("membership_status", ["moderator", "admin"])
        .order("username"),
    ]);
  if (
    profilesError ||
    messagesError ||
    historyError ||
    reportCountsError ||
    priorActionsError ||
    activeRestrictionsError ||
    moderationActionsError ||
    appealsError ||
    moderatorsError
  ) {
    console.error(
      "Could not load community report details",
      profilesError ||
        messagesError ||
        historyError ||
        reportCountsError ||
        priorActionsError ||
        activeRestrictionsError ||
        moderationActionsError ||
        appealsError ||
        moderatorsError
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
      ...(moderationActions ?? []).flatMap((event) =>
        typeof event.actor_id === "string" ? [event.actor_id] : []
      ),
      ...(appeals ?? []).flatMap((appeal) =>
        [appeal.appellant_id, appeal.reviewed_by].filter(
          (actorId): actorId is string => typeof actorId === "string"
        )
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
  for (const profile of moderators ?? []) {
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
  const actionsByReport = new Map<string, typeof moderationActions>();
  for (const action of moderationActions ?? []) {
    if (!action.report_id) continue;
    actionsByReport.set(action.report_id, [
      ...(actionsByReport.get(action.report_id) ?? []),
      action,
    ]);
  }
  const appealsByReport = new Map<string, typeof appeals>();
  for (const appeal of appeals ?? []) {
    appealsByReport.set(appeal.report_id, [
      ...(appealsByReport.get(appeal.report_id) ?? []),
      appeal,
    ]);
  }
  const topicIds = [...new Set(
    rows.flatMap((report) =>
      report.content_type === "post" && report.content_id ? [report.content_id] : []
    )
  )];
  const replyIds = [...new Set(
    rows.flatMap((report) =>
      report.content_type === "reply" && report.content_id ? [report.content_id] : []
    )
  )];
  const [
    { data: moderatedTopics, error: moderatedTopicsError },
    { data: moderatedReplies, error: moderatedRepliesError },
  ] = await Promise.all([
    topicIds.length
      ? context.serviceRole
          .from("forum_topics")
          .select("id, moderation_hidden")
          .in("id", topicIds)
      : { data: [], error: null },
    replyIds.length
      ? context.serviceRole
          .from("forum_replies")
          .select("id, moderation_hidden")
          .in("id", replyIds)
      : { data: [], error: null },
  ]);
  if (moderatedTopicsError || moderatedRepliesError) {
    console.error("Could not load reported content visibility", moderatedTopicsError || moderatedRepliesError);
    return NextResponse.json({ error: "Could not load reported content visibility" }, { status: 500 });
  }
  const hiddenContentIds = new Set([
    ...(moderatedTopics ?? []).filter((item) => item.moderation_hidden).map((item) => item.id),
    ...(moderatedReplies ?? []).filter((item) => item.moderation_hidden).map((item) => item.id),
  ]);
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
      assignedTo: report.assigned_to
        ? profilesById.get(report.assigned_to)?.username || "Moderator"
        : null,
      assignedToId: report.assigned_to,
      contentHidden: report.content_id ? hiddenContentIds.has(report.content_id) : false,
      moderationActions: (actionsByReport.get(report.id) ?? []).map((action) => ({
        ...action,
        actor: action.actor_id
          ? profilesById.get(action.actor_id)?.username || "Moderator"
          : "Former moderator",
      })),
      appeals: (appealsByReport.get(report.id) ?? []).map((appeal) => ({
        ...appeal,
        appellant: profilesById.get(appeal.appellant_id)?.username || "Member",
        reviewer: appeal.reviewed_by
          ? profilesById.get(appeal.reviewed_by)?.username || "Former moderator"
          : null,
      })),
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
    moderators: (moderators ?? []).map((moderator) => ({
      id: moderator.id,
      username: moderator.username || "Moderator",
    })),
    currentUserId: context.user.id,
    canDeletePermanently: hasPermission(context.role, "manage_users"),
  });
}

export async function PATCH(request: NextRequest) {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    id?: unknown;
    status?: unknown;
    action?: unknown;
    assignedToId?: unknown;
    appealId?: unknown;
    appealStatus?: unknown;
    resolutionNote?: unknown;
    note?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.id !== "string" || !UUID_PATTERN.test(body.id)) {
    return NextResponse.json({ error: "Invalid report identifier" }, { status: 400 });
  }

  if (body.action === "assign" || body.action === "unassign") {
    let assignedTo: string | null = null;
    let assignedToName = "";
    if (body.action === "assign") {
      assignedTo = typeof body.assignedToId === "string"
        ? body.assignedToId
        : context.user.id;
      if (!UUID_PATTERN.test(assignedTo)) {
        return NextResponse.json({ error: "Invalid moderator assignment" }, { status: 400 });
      }
      const { data: assignee, error: assigneeError } = await context.serviceRole
        .from("profiles")
        .select("id, username")
        .eq("id", assignedTo)
        .in("membership_status", ["moderator", "admin"])
        .maybeSingle();
      if (assigneeError) {
        console.error("Could not verify report assignee", assigneeError);
        return NextResponse.json({ error: "Could not verify moderator" }, { status: 500 });
      }
      if (!assignee) return NextResponse.json({ error: "Choose a moderator or administrator." }, { status: 400 });
      assignedToName = assignee.username || "Moderator";
    }
    let query = context.serviceRole
      .from("community_reports")
      .update({ assigned_to: assignedTo })
      .eq("id", body.id);
    if (body.action === "assign") {
      query = query.or(`assigned_to.is.null,assigned_to.eq.${assignedTo}`);
    } else {
      query = query.eq("assigned_to", context.user.id);
    }
    const { data, error } = await query.select("id, reported_user_id").maybeSingle();
    if (error) {
      console.error("Could not update community report assignment", error);
      return NextResponse.json({ error: "Could not update report assignment" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "This report is already assigned to another moderator." },
        { status: 409 }
      );
    }
    if (
      !(await writeAdminAuditEvent(context.serviceRole, {
        actorId: context.user.id,
        action: body.action === "assign"
          ? "community_report.claimed"
          : "community_report.released",
        targetType: "community_report",
        targetId: body.id,
      }))
    ) {
      return NextResponse.json(
        { error: "Assignment changed, but the audit log could not be updated." },
        { status: 500 }
      );
    }
    if (
      !(await recordModerationEvent(context.serviceRole, {
        reportId: body.id,
        userId: data.reported_user_id,
        actorId: context.user.id,
        actionType: body.action === "assign" ? "assigned" : "unassigned",
        reason: body.action === "assign" ? `Assigned to ${assignedToName}` : "Released report assignment",
      }))
    ) {
      return NextResponse.json({ error: "Assignment changed, but its report history could not be updated." }, { status: 500 });
    }
    return NextResponse.json({ success: true, assignedTo });
  }

  const assignmentError = await checkReportAssignment(
    context.serviceRole,
    context.role,
    context.user.id,
    body.id
  );
  if (assignmentError) return assignmentError;

  if (body.action === "save_note") {
    if (typeof body.note !== "string" || body.note.trim().length > 2000) {
      return NextResponse.json({ error: "Notes must be 2000 characters or fewer." }, { status: 400 });
    }
    const note = body.note.trim() || null;
    const { data, error } = await context.serviceRole
      .from("community_reports")
      .update({ moderator_notes: note })
      .eq("id", body.id)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("Could not save moderator report notes", error);
      return NextResponse.json({ error: "Could not save moderator notes" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (
      !(await writeAdminAuditEvent(context.serviceRole, {
        actorId: context.user.id,
        action: "community_report.note_updated",
        targetType: "community_report",
        targetId: body.id,
      }))
    ) {
      return NextResponse.json(
        { error: "Notes were saved, but the audit log could not be updated." },
        { status: 500 }
      );
    }
    if (
      !(await recordModerationEvent(context.serviceRole, {
        reportId: body.id,
        userId: context.user.id,
        actorId: context.user.id,
        actionType: "note",
        reason: "Private moderator notes updated",
      }))
    ) {
      return NextResponse.json({ error: "Notes were saved, but report history could not be updated." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body.action === "resolve_appeal") {
    if (
      typeof body.appealId !== "string" ||
      !UUID_PATTERN.test(body.appealId) ||
      (body.appealStatus !== "upheld" && body.appealStatus !== "overturned") ||
      typeof body.resolutionNote !== "string" ||
      body.resolutionNote.trim().length < 3 ||
      body.resolutionNote.trim().length > 1000
    ) {
      return NextResponse.json({ error: "Invalid appeal decision" }, { status: 400 });
    }
    const { data: appealRecord, error: appealRecordError } = await context.serviceRole
      .from("community_report_appeals")
      .select("action_id")
      .eq("id", body.appealId)
      .eq("report_id", body.id)
      .eq("status", "pending")
      .maybeSingle();
    if (appealRecordError) {
      console.error("Could not verify appeal reviewer eligibility", appealRecordError);
      return NextResponse.json({ error: "Could not verify appeal" }, { status: 500 });
    }
    if (!appealRecord) return NextResponse.json({ error: "Pending appeal not found" }, { status: 404 });
    const { data: appealedAction, error: appealedActionError } = await context.serviceRole
      .from("community_moderation_actions")
      .select("actor_id")
      .eq("id", appealRecord.action_id)
      .maybeSingle();
    if (appealedActionError) {
      console.error("Could not load appealed moderation action", appealedActionError);
      return NextResponse.json({ error: "Could not verify appeal" }, { status: 500 });
    }
    if (appealedAction?.actor_id === context.user.id) {
      return NextResponse.json({ error: "A moderator cannot review their own decision." }, { status: 403 });
    }
    if (context.role === "moderator" && appealedAction?.actor_id) {
      const { data: originalActor, error: originalActorError } = await context.serviceRole
        .from("profiles")
        .select("membership_status")
        .eq("id", appealedAction.actor_id)
        .maybeSingle();
      if (originalActorError) {
        console.error("Could not verify original moderation actor", originalActorError);
        return NextResponse.json({ error: "Could not verify appeal reviewer eligibility" }, { status: 500 });
      }
      if (originalActor?.membership_status !== "member") {
        return NextResponse.json(
          { error: "Appeals of moderator or administrator decisions must be reviewed by an administrator." },
          { status: 403 }
        );
      }
    }
    const { data, error } = await context.serviceRole.rpc(
      "resolve_community_report_appeal",
      {
        p_appeal_id: body.appealId,
        p_report_id: body.id,
        p_actor_id: context.user.id,
        p_status: body.appealStatus,
        p_resolution_note: body.resolutionNote.trim(),
      }
    );
    if (error) {
      console.error("Could not resolve community report appeal", error);
      return NextResponse.json({ error: "Could not resolve appeal" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Pending appeal not found" }, { status: 404 });
    if (
      !(await writeAdminAuditEvent(context.serviceRole, {
        actorId: context.user.id,
        action: `community_report.appeal_${body.appealStatus}`,
        targetType: "community_report",
        targetId: body.id,
        details: { appeal_id: body.appealId },
      }))
    ) {
      return NextResponse.json(
        { error: "Appeal was resolved, but the audit log could not be updated." },
        { status: 500 }
      );
    }
    if (
      !(await recordModerationEvent(context.serviceRole, {
        reportId: body.id,
        userId: data.appellant_id,
        actorId: context.user.id,
        actionType: body.appealStatus === "upheld" ? "appeal_upheld" : "appeal_overturned",
        reason: body.resolutionNote.trim(),
      }))
    ) {
      return NextResponse.json({ error: "Appeal was resolved, but report history could not be updated." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (
    body.status !== "open" &&
    body.status !== "under_review" &&
    body.status !== "action_taken" &&
    body.status !== "closed"
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

export async function POST(request: NextRequest) {
  let body: {
    id?: unknown;
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
    typeof body.id !== "string" ||
    !UUID_PATTERN.test(body.id) ||
    (body.action !== "warning" &&
      body.action !== "mute" &&
      body.action !== "hide" &&
      body.action !== "restore" &&
      body.action !== "escalate") ||
    typeof body.reason !== "string" ||
    body.reason.trim().length < 3 ||
    body.reason.trim().length > 500 ||
    (body.action === "mute" &&
      (!Number.isInteger(body.durationDays) ||
        (body.durationDays as number) < 1 ||
        (body.durationDays as number) > 14))
  ) {
    return NextResponse.json({ error: "Invalid moderation action" }, { status: 400 });
  }

  const action = body.action;
  const context = await authorize(
    action === "warning" || action === "mute"
      ? "moderate_community_members"
      : "review_reports"
  );
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: report, error: reportError } = await context.serviceRole
    .from("community_reports")
    .select("id, reported_user_id, content_type, content_id, assigned_to")
    .eq("id", body.id)
    .maybeSingle();
  if (reportError) {
    console.error("Could not load report for moderation action", reportError);
    return NextResponse.json({ error: "Could not load report" }, { status: 500 });
  }
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (
    context.role !== "admin" &&
    report.assigned_to &&
    report.assigned_to !== context.user.id
  ) {
    return NextResponse.json(
      { error: "This report is assigned to another moderator." },
      { status: 409 }
    );
  }

  const reason = body.reason.trim();
  if (action === "warning" || action === "mute") {
    const { data: targetProfile, error: targetProfileError } = await context.serviceRole
      .from("profiles")
      .select("membership_status")
      .eq("id", report.reported_user_id)
      .maybeSingle();
    if (targetProfileError) {
      console.error("Could not verify member role before moderation action", targetProfileError);
      return NextResponse.json({ error: "Could not verify member role" }, { status: 500 });
    }
    if (
      context.role === "moderator" &&
      targetProfile?.membership_status !== "member"
    ) {
      return NextResponse.json(
        { error: "Moderators cannot issue actions against other moderators or administrators. Escalate this report instead." },
        { status: 403 }
      );
    }
  }
  const now = new Date();
  let restrictionEndsAt: string | null = null;
  if (action === "warning" || action === "mute") {
    if (action === "mute") {
      restrictionEndsAt = new Date(
        now.getTime() + Number(body.durationDays) * 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: activeMute, error: activeMuteError } = await context.serviceRole
        .from("user_restrictions")
        .select("user_id")
        .eq("user_id", report.reported_user_id)
        .eq("restriction_type", "mute")
        .is("revoked_at", null)
        .lte("starts_at", now.toISOString())
        .or(`ends_at.is.null,ends_at.gt.${now.toISOString()}`)
        .maybeSingle();
      if (activeMuteError) {
        console.error("Could not check existing member mute", activeMuteError);
        return NextResponse.json({ error: "Could not check current restrictions" }, { status: 500 });
      }
      if (activeMute) return NextResponse.json({ error: "This member already has an active mute." }, { status: 409 });

      const { error } = await context.serviceRole.from("user_restrictions").upsert(
        {
          user_id: report.reported_user_id,
          restriction_type: "mute",
          starts_at: now.toISOString(),
          ends_at: restrictionEndsAt,
          reason,
          created_by: context.user.id,
          revoked_at: null,
          revoked_by: null,
          updated_at: now.toISOString(),
        },
        { onConflict: "user_id,restriction_type" }
      );
      if (error) {
        console.error("Could not apply community posting mute", error);
        return NextResponse.json({ error: "Could not apply mute" }, { status: 500 });
      }
    }

    const { data: moderationAction, error: actionError } = await context.serviceRole
      .from("community_moderation_actions")
      .insert({
        report_id: report.id,
        user_id: report.reported_user_id,
        actor_id: context.user.id,
        action_type: action,
        reason,
        restriction_ends_at: restrictionEndsAt,
      })
      .select("id")
      .single();
    if (actionError) {
      console.error("Moderation action was applied but could not be recorded", actionError);
      return NextResponse.json({ error: "Action was applied, but its history could not be recorded." }, { status: 500 });
    }
    if (
      !(await writeAdminAuditEvent(context.serviceRole, {
        actorId: context.user.id,
        action: `community_report.${action}`,
        targetType: "community_report",
        targetId: report.id,
        details: { target_user_id: report.reported_user_id, reason, restriction_ends_at: restrictionEndsAt },
      }))
    ) {
      return NextResponse.json(
        { error: "Action was applied, but the audit log could not be updated." },
        { status: 500 }
      );
    }
    if (
      !(await writeAdminAuditEvent(context.serviceRole, {
        actorId: context.user.id,
        action: action === "mute" ? "user.restriction_applied" : "user.warning_issued",
        targetType: "user",
        targetId: report.reported_user_id,
        details: {
          restriction_type: action === "mute" ? "mute" : null,
          report_id: report.id,
          reason,
          restriction_ends_at: restrictionEndsAt,
        },
      }))
    ) {
      return NextResponse.json(
        { error: "Action was applied, but the member audit history could not be updated." },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, actionId: moderationAction.id });
  }

  if (action === "hide" || action === "restore") {
    if (
      !report.content_id ||
      (report.content_type !== "post" && report.content_type !== "reply")
    ) {
      return NextResponse.json(
        { error: "Reversible hiding is currently available for forum posts and replies." },
        { status: 400 }
      );
    }
    const table = report.content_type === "post" ? "forum_topics" : "forum_replies";
    const hidden = action === "hide";
    const { data, error } = await context.serviceRole
      .from(table)
      .update({
        moderation_hidden: hidden,
        moderation_hidden_at: hidden ? now.toISOString() : null,
        moderation_hidden_by: hidden ? context.user.id : null,
        moderation_hidden_reason: hidden ? reason : null,
      })
      .eq("id", report.content_id)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("Could not update reported forum content visibility", error);
      return NextResponse.json({ error: "Could not update reported content visibility" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Reported content no longer exists" }, { status: 404 });
    if (
      !(await writeAdminAuditEvent(context.serviceRole, {
        actorId: context.user.id,
        action: `community_report.content_${hidden ? "hidden" : "restored"}`,
        targetType: `forum_${report.content_type}`,
        targetId: report.content_id,
        details: { report_id: report.id, reason },
      }))
    ) {
      return NextResponse.json(
        { error: "Visibility changed, but the audit log could not be updated." },
        { status: 500 }
      );
    }
    if (
      !(await recordModerationEvent(context.serviceRole, {
        reportId: report.id,
        userId: report.reported_user_id,
        actorId: context.user.id,
        actionType: hidden ? "content_hidden" : "content_restored",
        reason,
      }))
    ) {
      return NextResponse.json({ error: "Visibility changed, but report history could not be updated." }, { status: 500 });
    }
    return NextResponse.json({ success: true, hidden });
  }

  const { data, error } = await context.serviceRole
    .from("community_reports")
    .update({ escalated_at: now.toISOString(), escalation_note: reason })
    .eq("id", report.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not escalate community report", error);
    return NextResponse.json({ error: "Could not escalate report" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (
    !(await writeAdminAuditEvent(context.serviceRole, {
      actorId: context.user.id,
      action: "community_report.escalated",
      targetType: "community_report",
      targetId: report.id,
      details: { reason },
    }))
  ) {
    return NextResponse.json(
      { error: "Report was escalated, but the audit log could not be updated." },
      { status: 500 }
    );
  }
  if (
    !(await recordModerationEvent(context.serviceRole, {
      reportId: report.id,
      userId: report.reported_user_id,
      actorId: context.user.id,
      actionType: "escalation",
      reason,
    }))
  ) {
    return NextResponse.json({ error: "Report was escalated, but report history could not be updated." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const context = await authorize("manage_users");
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
