import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

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

  const [
    { data: notifications, error: notificationsError },
    { count: unreadCount, error: countError },
  ] = await Promise.all([
    serviceRole
      .from("community_notifications")
      .select("id, actor_id, type, message_id, created_at, read_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    serviceRole
      .from("community_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
  ]);

  if (notificationsError || countError) {
    console.error("Could not load community notifications", notificationsError || countError);
    return NextResponse.json({ error: "Could not load community notifications" }, { status: 500 });
  }

  const rows = notifications ?? [];
  const actorIds = [...new Set(rows.map((notification) => notification.actor_id))];
  const messageIds = rows.flatMap((notification) =>
    notification.message_id ? [notification.message_id] : []
  );
  const [{ data: actors, error: actorsError }, { data: messages, error: messagesError }] =
    await Promise.all([
      actorIds.length
        ? serviceRole.from("profiles").select("id, username").in("id", actorIds)
        : { data: [], error: null },
      messageIds.length
        ? serviceRole.from("community_messages").select("id, body").in("id", messageIds)
        : { data: [], error: null },
    ]);

  if (actorsError || messagesError) {
    console.error("Could not load community notification details", actorsError || messagesError);
    return NextResponse.json({ error: "Could not load community notifications" }, { status: 500 });
  }

  const actorsById = new Map((actors ?? []).map((actor) => [actor.id, actor]));
  const messagesById = new Map((messages ?? []).map((message) => [message.id, message]));
  return NextResponse.json({
    unreadCount: unreadCount ?? 0,
    notifications: rows.map((notification) => ({
      ...notification,
      actor_name: actorsById.get(notification.actor_id)?.username || "Community member",
      body: notification.message_id
        ? messagesById.get(notification.message_id)?.body || ""
        : "",
    })),
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
    return NextResponse.json({ error: "A list of notification IDs is required" }, { status: 400 });
  }

  let update = serviceRole
    .from("community_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  if (!markAll) update = update.in("id", body.ids as string[]);

  const { error } = await update;
  if (error) {
    console.error("Could not mark community notifications read", error);
    return NextResponse.json({ error: "Could not update notifications" }, { status: 500 });
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
    .from("community_notifications")
    .delete()
    .eq("recipient_id", user.id);
  if (error) {
    console.error("Could not clear community notifications", error);
    return NextResponse.json({ error: "Could not clear community notifications" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
