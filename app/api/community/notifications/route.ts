import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { decodeForumContent } from "@/lib/community/forumContent";

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

  const [
    { data: replyNotifications, error: replyNotificationsError },
    { count: replyUnreadCount, error: replyCountError },
    { data: likeNotifications, error: likeNotificationsError },
    { count: likeUnreadCount, error: likeCountError },
  ] = await Promise.all([
    supabase
      .from("forum_reply_notifications")
      .select("id, topic_id, reply_id, created_at, read_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("forum_reply_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
    serviceRole
      .from("forum_like_notifications")
      .select("id, actor_id, target_type, target_id, topic_id, created_at, read_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    serviceRole
      .from("forum_like_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
  ]);

  if (
    replyNotificationsError ||
    replyCountError ||
    likeNotificationsError ||
    likeCountError
  ) {
    console.error(
      "Could not load forum notifications",
      replyNotificationsError || replyCountError || likeNotificationsError || likeCountError
    );
    return NextResponse.json({ error: "Could not load notifications" }, { status: 500 });
  }

  const replyRows = replyNotifications ?? [];
  const likeRows = likeNotifications ?? [];
  const topicIds = [...new Set([
    ...replyRows.map((notification) => notification.topic_id),
    ...likeRows.map((notification) => notification.topic_id),
  ])];
  const replyIds = replyRows.map((notification) => notification.reply_id);
  const [{ data: topics, error: topicsError }, { data: replies, error: repliesError }] =
    await Promise.all([
      topicIds.length
        ? serviceRole.from("forum_topics").select("id, title").in("id", topicIds)
        : { data: [], error: null },
      replyIds.length
        ? serviceRole
            .from("forum_replies")
            .select("id, body, author_id")
            .in("id", replyIds)
        : { data: [], error: null },
    ]);

  if (topicsError || repliesError) {
    console.error("Could not load forum notification details", topicsError || repliesError);
    return NextResponse.json({ error: "Could not load notifications" }, { status: 500 });
  }

  const replyAuthorIds = (replies ?? []).map((reply) => reply.author_id);
  const authorIds = [...new Set([
    ...replyAuthorIds,
    ...likeRows.map((notification) => notification.actor_id),
  ])];
  const { data: authors, error: authorsError } = authorIds.length
    ? await serviceRole.from("profiles").select("id, username").in("id", authorIds)
    : { data: [], error: null };

  if (authorsError) {
    console.error("Could not load notification authors", authorsError);
    return NextResponse.json({ error: "Could not load notifications" }, { status: 500 });
  }

  const topicsById = new Map((topics ?? []).map((topic) => [topic.id, topic]));
  const authorsById = new Map((authors ?? []).map((author) => [author.id, author]));
  const repliesById = new Map((replies ?? []).map((reply) => [reply.id, reply]));
  const forumReplyNotifications = replyRows.flatMap((notification) => {
    const topic = topicsById.get(notification.topic_id);
    const reply = repliesById.get(notification.reply_id);
    if (!topic || !reply) return [];
    const replyContent = decodeForumContent(reply.body);

    return [{
      ...notification,
      kind: "forum_reply" as const,
      topic_title: topic.title,
      reply_body:
        replyContent.body ||
        (replyContent.imagePaths.length ? "Image attachment" : ""),
      reply_author: authorsById.get(reply.author_id)?.username || "Community member",
    }];
  });
  const forumLikeNotifications = likeRows.flatMap((notification) => {
    const topic = topicsById.get(notification.topic_id);
    if (!topic) return [];
    return [{
      ...notification,
      kind: "forum_like" as const,
      topic_title: topic.title,
      actor_name: authorsById.get(notification.actor_id)?.username || "Community member",
    }];
  });

  return NextResponse.json({
    unreadCount: (replyUnreadCount ?? 0) + (likeUnreadCount ?? 0),
    notifications: [...forumReplyNotifications, ...forumLikeNotifications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20),
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

  let body: { ids?: unknown; all?: unknown; kind?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const markAll = body.all === true;
  if (!markAll && body.kind !== undefined && body.kind !== "forum_reply" && body.kind !== "forum_like") {
    return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
  }
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

  const updateReadAt = new Date().toISOString();
  const updateReplyNotifications = () => {
    let query = supabase
      .from("forum_reply_notifications")
      .update({ read_at: updateReadAt })
      .eq("recipient_id", user.id)
      .is("read_at", null);
    if (!markAll) query = query.in("id", body.ids as string[]);
    return query;
  };
  const updateLikeNotifications = () => {
    let query = serviceRole
      .from("forum_like_notifications")
      .update({ read_at: updateReadAt })
      .eq("recipient_id", user.id)
      .is("read_at", null);
    if (!markAll) query = query.in("id", body.ids as string[]);
    return query;
  };

  const updates = markAll
    ? await Promise.all([updateReplyNotifications(), updateLikeNotifications()])
    : [body.kind === "forum_like"
        ? await updateLikeNotifications()
        : await updateReplyNotifications()];
  const updateError = updates.find((update) => update.error)?.error;
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

  const [{ error: replyDeleteError }, { error: likeDeleteError }] = await Promise.all([
    serviceRole.from("forum_reply_notifications").delete().eq("recipient_id", user.id),
    serviceRole.from("forum_like_notifications").delete().eq("recipient_id", user.id),
  ]);

  if (replyDeleteError || likeDeleteError) {
    console.error("Could not clear forum notifications", replyDeleteError || likeDeleteError);
    return NextResponse.json(
      { error: "Could not clear forum notifications" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
