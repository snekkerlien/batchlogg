import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(permission: "manage_changelog" | "broadcast_announcements") {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  if (!hasPermission(await getMembershipRole(supabase, user), permission)) return null;
  return { user, serviceRole };
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export async function GET() {
  const context = await authorize("manage_changelog");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [
    { data: changelog, error: changelogError },
    { data: announcements, error: announcementsError },
  ] = await Promise.all([
    context.serviceRole
      .from("site_changelog")
      .select("version, entry_date, title, body, created_at, updated_at")
      .order("entry_date", { ascending: false })
      .limit(100),
    context.serviceRole
      .from("site_announcements")
      .select("id, title, body, is_active, starts_at, ends_at, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);
  if (changelogError || announcementsError) {
    console.error("Could not load admin content", changelogError || announcementsError);
    return NextResponse.json({ error: "Could not load admin content" }, { status: 500 });
  }
  return NextResponse.json({ changelog: changelog ?? [], announcements: announcements ?? [] });
}

export async function POST(request: NextRequest) {
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

  if (body.kind === "changelog") {
    const context = await authorize("manage_changelog");
    if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (
      !isText(body.version, 32) ||
      !/^[a-zA-Z0-9._-]+$/.test(body.version) ||
      !isText(body.title, 160) ||
      !isText(body.body, 10000) ||
      typeof body.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.date) ||
      Number.isNaN(Date.parse(`${body.date}T00:00:00Z`))
    ) {
      return NextResponse.json({ error: "Invalid changelog entry" }, { status: 400 });
    }
    const { error } = await context.serviceRole.from("site_changelog").upsert({
      version: body.version.trim(),
      entry_date: body.date,
      title: body.title.trim(),
      body: body.body.trim(),
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Could not save changelog entry", error);
      return NextResponse.json({ error: "Could not save changelog entry" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body.kind === "announcement") {
    const context = await authorize("broadcast_announcements");
    if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const startsAt = body.startsAt === "" || body.startsAt === null ? null : body.startsAt;
    const endsAt = body.endsAt === "" || body.endsAt === null ? null : body.endsAt;
    const parsedStart = startsAt === null ? null : Date.parse(String(startsAt));
    const parsedEnd = endsAt === null ? null : Date.parse(String(endsAt));
    if (
      !isText(body.title, 160) ||
      !isText(body.body, 5000) ||
      typeof body.isActive !== "boolean" ||
      (startsAt !== null && (!Number.isFinite(parsedStart) || typeof startsAt !== "string")) ||
      (endsAt !== null && (!Number.isFinite(parsedEnd) || typeof endsAt !== "string")) ||
      (parsedStart !== null && parsedEnd !== null && parsedEnd <= parsedStart)
    ) {
      return NextResponse.json({ error: "Invalid announcement" }, { status: 400 });
    }
    const { error } = await context.serviceRole.from("site_announcements").insert({
      title: body.title.trim(),
      body: body.body.trim(),
      is_active: body.isActive,
      starts_at: startsAt,
      ends_at: endsAt,
      created_by: context.user.id,
    });
    if (error) {
      console.error("Could not create site announcement", error);
      return NextResponse.json({ error: "Could not create announcement" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const context = await authorize("manage_changelog");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const kind = request.nextUrl.searchParams.get("kind");
  const id = request.nextUrl.searchParams.get("id");
  if (kind === "changelog" && id) {
    const { error } = await context.serviceRole.from("site_changelog").delete().eq("version", id);
    if (error) {
      console.error("Could not delete changelog entry", error);
      return NextResponse.json({ error: "Could not delete changelog entry" }, { status: 500 });
    }
  } else if (kind === "announcement" && id) {
    const { error } = await context.serviceRole.from("site_announcements").delete().eq("id", id);
    if (error) {
      console.error("Could not delete announcement", error);
      return NextResponse.json({ error: "Could not delete announcement" }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: "Invalid content identifier" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
