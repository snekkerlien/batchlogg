import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";

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
    ]);
  if (profilesError || messagesError || historyError || reportCountsError) {
    console.error(
      "Could not load community report details",
      profilesError || messagesError || historyError || reportCountsError
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
      history: (history ?? []).filter((event) => event.report_id === report.id),
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
  return NextResponse.json({ success: true });
}
