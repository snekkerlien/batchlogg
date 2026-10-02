import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pairFor(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

async function getUser(supabase: ReturnType<typeof supabaseServer>["supabase"]) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

async function canMessage(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  userId: string,
  peerId: string
) {
  const [user_a, user_b] = pairFor(userId, peerId);
  const [{ data: friendship, error: friendshipError }, { data: blocks, error: blockError }] =
    await Promise.all([
      serviceRole
        .from("community_friendships")
        .select("id")
        .eq("user_a", user_a)
        .eq("user_b", user_b)
        .maybeSingle(),
      serviceRole
        .from("community_blocks")
        .select("id")
        .or(
          `and(blocker_id.eq.${userId},blocked_id.eq.${peerId}),and(blocker_id.eq.${peerId},blocked_id.eq.${userId})`
        ),
    ]);

  if (friendshipError || blockError) {
    throw friendshipError || blockError;
  }
  return !!friendship && !(blocks?.length);
}

export async function GET(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const { user, error: authError } = await getUser(supabase);
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const peerId = request.nextUrl.searchParams.get("peer_id");
  if (peerId) {
    if (!UUID_PATTERN.test(peerId) || peerId === user.id) {
      return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
    }

    try {
      if (!(await canMessage(serviceRole, user.id, peerId))) {
        return NextResponse.json({ error: "This conversation is unavailable" }, { status: 403 });
      }
    } catch (error) {
      console.error("Could not verify conversation access", error);
      return NextResponse.json({ error: "Could not load conversation" }, { status: 500 });
    }

    const before = request.nextUrl.searchParams.get("before");
    if (before && !Number.isFinite(new Date(before).getTime())) {
      return NextResponse.json({ error: "Invalid message cursor" }, { status: 400 });
    }

    let messagesQuery = serviceRole
      .from("community_messages")
      .select("id, sender_id, recipient_id, body, created_at, read_at")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: false })
      .limit(101);
    if (before) messagesQuery = messagesQuery.lt("created_at", before);

    const [{ data: messages, error: messagesError }, { count: unreadCount, error: unreadError }] =
      await Promise.all([
        messagesQuery,
        serviceRole
          .from("community_messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", peerId)
          .eq("recipient_id", user.id)
          .is("read_at", null),
      ]);
    if (messagesError) {
      console.error("Could not load conversation messages", messagesError);
      return NextResponse.json({ error: "Could not load conversation" }, { status: 500 });
    }
    if (unreadError) {
      console.error("Could not count unread conversation messages", unreadError);
      return NextResponse.json({ error: "Could not load conversation" }, { status: 500 });
    }

    const hasMore = (messages ?? []).length > 100;
    const pageMessages = (messages ?? []).slice(0, 100);
    if (unreadCount) {
      const { error: readError } = await serviceRole
        .from("community_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", peerId)
        .eq("recipient_id", user.id)
        .is("read_at", null);
      if (readError) {
        console.error("Could not mark conversation messages read", readError);
        return NextResponse.json({ error: "Could not update conversation" }, { status: 500 });
      }

      const { error: notificationReadError } = await serviceRole
        .from("community_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("actor_id", peerId)
        .eq("type", "message")
        .is("read_at", null);
      if (notificationReadError) {
        console.error("Could not mark message notifications read", notificationReadError);
        return NextResponse.json({ error: "Could not update conversation" }, { status: 500 });
      }
    }

    const { data: peer, error: peerError } = await serviceRole
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", peerId)
      .single();
    if (peerError) {
      console.error("Could not load conversation member", peerError);
      return NextResponse.json({ error: "Could not load conversation" }, { status: 500 });
    }

    return NextResponse.json({
      peer,
      hasMore,
      messages: pageMessages.reverse().map((message) =>
        message.sender_id === peerId && !message.read_at
          ? { ...message, read_at: new Date().toISOString() }
          : message
      ),
    });
  }

  const { data: friendships, error: friendshipsError } = await serviceRole
    .from("community_friendships")
    .select("user_a, user_b")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
  if (friendshipsError) {
    console.error("Could not load message inbox friendships", friendshipsError);
    return NextResponse.json({ error: "Could not load inbox" }, { status: 500 });
  }

  const friendIds = (friendships ?? []).map((friendship) =>
    friendship.user_a === user.id ? friendship.user_b : friendship.user_a
  );
  if (!friendIds.length) return NextResponse.json({ conversations: [] });

  const [
    { data: friends, error: friendsError },
    { data: messages, error: messagesError },
  ] = await Promise.all([
    serviceRole
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", friendIds)
      .order("username", { ascending: true }),
    serviceRole
      .from("community_messages")
      .select("id, sender_id, recipient_id, body, created_at, read_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  if (friendsError || messagesError) {
    console.error("Could not load message inbox", friendsError || messagesError);
    return NextResponse.json({ error: "Could not load inbox" }, { status: 500 });
  }

  const byFriend = new Map<string, typeof messages>();
  for (const message of messages ?? []) {
    const friendId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
    if (!byFriend.has(friendId)) byFriend.set(friendId, []);
    byFriend.get(friendId)?.push(message);
  }

  const conversations = (friends ?? []).map((friend) => {
      const thread = byFriend.get(friend.id) ?? [];
      return {
        ...friend,
        latest: thread[0] ?? null,
        unreadCount: thread.filter(
          (message) => message.recipient_id === user.id && !message.read_at
        ).length,
      };
    });

  conversations.sort(
    (a, b) =>
      new Date(b.latest?.created_at ?? 0).getTime() -
      new Date(a.latest?.created_at ?? 0).getTime()
  );
  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const { user, error: authError } = await getUser(supabase);
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { peerId?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (
    typeof body.peerId !== "string" ||
    !UUID_PATTERN.test(body.peerId) ||
    body.peerId === user.id ||
    message.length < 1 ||
    message.length > 2000
  ) {
    return NextResponse.json(
      { error: "Enter a message up to 2000 characters and choose a valid friend" },
      { status: 400 }
    );
  }

  try {
    if (!(await canMessage(serviceRole, user.id, body.peerId))) {
      return NextResponse.json({ error: "You can only message friends who have not blocked you" }, { status: 403 });
    }
  } catch (error) {
    console.error("Could not verify message recipient", error);
    return NextResponse.json({ error: "Could not verify recipient" }, { status: 500 });
  }

  const { data: sent, error: sendError } = await serviceRole
    .from("community_messages")
    .insert({
      sender_id: user.id,
      recipient_id: body.peerId,
      body: message,
    })
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .single();

  if (sendError) {
    console.error("Could not send community message", sendError);
    const status = sendError.message.includes("rate limit") ? 429 : 500;
    return NextResponse.json(
      { error: status === 429 ? "You’re sending messages too quickly. Try again shortly." : "Could not send message" },
      { status }
    );
  }

  const { error: notificationError } = await serviceRole
    .from("community_notifications")
    .insert({
      recipient_id: body.peerId,
      actor_id: user.id,
      type: "message",
      message_id: sent.id,
    });
  if (notificationError) {
    console.error("Message sent but notification could not be created", notificationError);
    return NextResponse.json({
      message: sent,
      warning: "Message sent, but its notification could not be created.",
    });
  }

  return NextResponse.json({ message: sent });
}
