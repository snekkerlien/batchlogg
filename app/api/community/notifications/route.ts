import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

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

  const { data: notifications, error: notificationsError } = await supabase
    .from("forum_reply_notifications")
    .select("id, topic_id, reply_id, created_at, read_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (notificationsError) {
    console.error("Could not load forum notifications", notificationsError);
    return NextResponse.json(
      { error: "Could not load notifications" },
      { status: 500 }
    );
  }

  const { count: unreadCount, error: countError } = await supabase
    .from("forum_reply_notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (countError) {
    console.error("Could not count unread forum notifications", countError);
    return NextResponse.json(
      { error: "Could not count unread notifications" },
      { status: 500 }
    );
  }

  const rows = notifications ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ notifications: [], unreadCount: unreadCount ?? 0 });
  }

  const topicIds = [...new Set(rows.map((notification) => notification.topic_id))];
  const replyIds = rows.map((notification) => notification.reply_id);
  const { data: topics, error: topicsError } = await serviceRole
    .from("forum_topics")
    .select("id, title")
    .in("id", topicIds);

  if (topicsError) {
    console.error("Could not load notification topic titles", topicsError);
    return NextResponse.json(
      { error: "Could not load notifications" },
      { status: 500 }
    );
  }

  const { data: replies, error: repliesError } = await serviceRole
    .from("forum_replies")
    .select("id, body, author_id")
    .in("id", replyIds);

  if (repliesError) {
    console.error("Could not load notification replies", repliesError);
    return NextResponse.json(
      { error: "Could not load notifications" },
      { status: 500 }
    );
  }

  const replyRows = replies ?? [];
  const authorIds = [...new Set(replyRows.map((reply) => reply.author_id))];
  const { data: authors, error: authorsError } = authorIds.length
    ? await serviceRole
        .from("profiles")
        .select("id, username")
        .in("id", authorIds)
    : { data: [], error: null };

  if (authorsError) {
    console.error("Could not load notification authors", authorsError);
    return NextResponse.json(
      { error: "Could not load notifications" },
      { status: 500 }
    );
  }

  const topicsById = new Map((topics ?? []).map((topic) => [topic.id, topic]));
  const authorsById = new Map((authors ?? []).map((author) => [author.id, author]));
  const repliesById = new Map(replyRows.map((reply) => [reply.id, reply]));

  return NextResponse.json({
    unreadCount: unreadCount ?? 0,
    notifications: rows.flatMap((notification) => {
      const topic = topicsById.get(notification.topic_id);
      const reply = repliesById.get(notification.reply_id);
      if (!topic || !reply) return [];
      const author = authorsById.get(reply.author_id);

      return [{
        ...notification,
        topic_title: topic.title,
        reply_body: reply.body,
        reply_author: author?.username || "Community member",
      }];
    }),
  });
}

export async function PATCH(request: NextRequest) {
  const { supabase } = supabaseServer();
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
  if (!markAll && (
    !Array.isArray(body.ids) ||
    body.ids.length === 0 ||
    body.ids.length > 20 ||
    body.ids.some(
      (id) =>
        typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id
        )
    )
  )) {
    return NextResponse.json(
      { error: "A list of notification IDs is required" },
      { status: 400 }
    );
  }

  let updateQuery = supabase
    .from("forum_reply_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (!markAll) {
    updateQuery = updateQuery.in("id", body.ids as string[]);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) {
    console.error("Could not mark forum notifications as read", updateError);
    return NextResponse.json(
      { error: "Could not update notifications" },
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

  const { error: deleteError } = await serviceRole
    .from("forum_reply_notifications")
    .delete()
    .eq("recipient_id", user.id);

  if (deleteError) {
    console.error("Could not clear forum notifications", deleteError);
    return NextResponse.json(
      { error: "Could not clear forum notifications" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
