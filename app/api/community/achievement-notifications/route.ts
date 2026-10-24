import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { ensureCommunityAndRatingAchievementNotifications } from "@/lib/community/achievementNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    await ensureCommunityAndRatingAchievementNotifications(serviceRole, user.id);
  } catch (syncError) {
    console.error("Could not synchronize community and rating achievement notifications", syncError);
    return NextResponse.json(
      { error: "Could not synchronize achievement notifications" },
      { status: 500 }
    );
  }

  const [
    { data: notifications, error: notificationsError },
    { count: unreadCount, error: countError },
  ] = await Promise.all([
    serviceRole
      .from("achievement_notifications")
      .select("id, achievement_name, category, goal, created_at, read_at")
      .eq("recipient_id", user.id)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    serviceRole
      .from("achievement_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("dismissed_at", null)
      .is("read_at", null),
  ]);

  if (notificationsError || countError) {
    console.error(
      "Could not load achievement notifications",
      notificationsError || countError
    );
    return NextResponse.json(
      { error: "Could not load achievement notifications" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
  });
}

export async function PATCH(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { ids?: unknown; all?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const markAll = body.all === true;
  if (
    !markAll &&
    (!Array.isArray(body.ids) ||
      body.ids.length < 1 ||
      body.ids.length > 20 ||
      body.ids.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id)))
  ) {
    return NextResponse.json(
      { error: "A list of notification IDs is required" },
      { status: 400 }
    );
  }

  let update = serviceRole
    .from("achievement_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null)
    .is("dismissed_at", null);
  if (!markAll) update = update.in("id", body.ids as string[]);

  const { error } = await update;
  if (error) {
    console.error("Could not mark achievement notifications read", error);
    return NextResponse.json(
      { error: "Could not update achievement notifications" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { error } = await serviceRole
    .from("achievement_notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("dismissed_at", null);
  if (error) {
    console.error("Could not clear achievement notifications", error);
    return NextResponse.json(
      { error: "Could not clear achievement notifications" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
