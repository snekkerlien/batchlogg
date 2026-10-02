import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { isAdminUser } from "@/lib/auth/isAdminUser";

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
  if (error || !isAdminUser(user)) return null;
  return { user, serviceRole };
}

export async function GET() {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: reports, error } = await context.serviceRole
    .from("community_reports")
    .select("id, reporter_id, reported_user_id, message_id, reason, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("Could not load community reports", error);
    return NextResponse.json({ error: "Could not load reports" }, { status: 500 });
  }

  const rows = reports ?? [];
  const profileIds = [...new Set(rows.flatMap((report) => [report.reporter_id, report.reported_user_id]))];
  const messageIds = rows.flatMap((report) => report.message_id ? [report.message_id] : []);
  const [{ data: profiles, error: profilesError }, { data: messages, error: messagesError }] =
    await Promise.all([
      profileIds.length
        ? context.serviceRole.from("profiles").select("id, username").in("id", profileIds)
        : { data: [], error: null },
      messageIds.length
        ? context.serviceRole.from("community_messages").select("id, body").in("id", messageIds)
        : { data: [], error: null },
    ]);
  if (profilesError || messagesError) {
    console.error("Could not load community report details", profilesError || messagesError);
    return NextResponse.json({ error: "Could not load report details" }, { status: 500 });
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const messagesById = new Map((messages ?? []).map((message) => [message.id, message]));
  return NextResponse.json({
    reports: rows.map((report) => ({
      ...report,
      reporter: profilesById.get(report.reporter_id)?.username || "Deleted user",
      reported: profilesById.get(report.reported_user_id)?.username || "Deleted user",
      reportedMessage: report.message_id
        ? messagesById.get(report.message_id)?.body || "(message no longer available)"
        : null,
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
    (body.status !== "open" && body.status !== "reviewed")
  ) {
    return NextResponse.json({ error: "Invalid report update" }, { status: 400 });
  }

  const { error } = await context.serviceRole
    .from("community_reports")
    .update({ status: body.status })
    .eq("id", body.id);
  if (error) {
    console.error("Could not update community report", error);
    return NextResponse.json({ error: "Could not update report" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
