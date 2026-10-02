import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pairFor(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

async function currentUser(supabase: ReturnType<typeof supabaseServer>["supabase"]) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

export async function GET() {
  const { supabase, serviceRole } = supabaseServer();
  const { user, error: authError } = await currentUser(supabase);
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const [
    { data: profile, error: profileError },
    { data: friendships, error: friendshipsError },
    { data: requests, error: requestsError },
    { data: blocks, error: blocksError },
    { data: discoverable, error: discoverableError },
  ] = await Promise.all([
    serviceRole
      .from("profiles")
      .select("allow_friend_requests")
      .eq("id", user.id)
      .single(),
    serviceRole
      .from("community_friendships")
      .select("user_a, user_b, created_at")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
    serviceRole
      .from("community_friend_requests")
      .select("id, requester_id, recipient_id, created_at")
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    serviceRole
      .from("community_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
    serviceRole
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("is_public", true)
      .eq("allow_friend_requests", true)
      .neq("id", user.id)
      .order("username", { ascending: true })
      .limit(200),
  ]);

  const errors = [
    profileError,
    friendshipsError,
    requestsError,
    blocksError,
    discoverableError,
  ].filter(Boolean);
  if (errors.length) {
    console.error("Could not load community friends data", errors);
    return NextResponse.json({ error: "Could not load friends" }, { status: 500 });
  }

  const blockedUserIds = new Set(
    (blocks ?? []).map((block) =>
      block.blocker_id === user.id ? block.blocked_id : block.blocker_id
    )
  );
  const friendIds = (friendships ?? []).map((friendship) =>
    friendship.user_a === user.id ? friendship.user_b : friendship.user_a
  );
  const requestedUserIds = new Set(
    (requests ?? []).map((request) =>
      request.requester_id === user.id ? request.recipient_id : request.requester_id
    )
  );
  const profileIds = [...new Set([
    ...friendIds,
    ...(blocks ?? [])
      .filter((block) => block.blocker_id === user.id)
      .map((block) => block.blocked_id),
    ...(requests ?? []).map((request) =>
      request.requester_id === user.id ? request.recipient_id : request.requester_id
    ),
  ])];

  const { data: people, error: peopleError } = profileIds.length
    ? await serviceRole
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", profileIds)
    : { data: [], error: null };

  if (peopleError) {
    console.error("Could not load friend profile details", peopleError);
    return NextResponse.json({ error: "Could not load friends" }, { status: 500 });
  }

  const peopleById = new Map((people ?? []).map((person) => [person.id, person]));
  return NextResponse.json({
    allowFriendRequests: profile?.allow_friend_requests ?? true,
    friends: (friendships ?? [])
      .map((friendship) => {
        const id = friendship.user_a === user.id ? friendship.user_b : friendship.user_a;
        return peopleById.has(id)
          ? { ...peopleById.get(id), created_at: friendship.created_at }
          : null;
      })
      .filter(Boolean),
    incoming: (requests ?? [])
      .filter((request) => request.recipient_id === user.id)
      .flatMap((request) => {
        const person = peopleById.get(request.requester_id);
        return person ? [{ ...request, person }] : [];
      }),
    outgoing: (requests ?? [])
      .filter((request) => request.requester_id === user.id)
      .flatMap((request) => {
        const person = peopleById.get(request.recipient_id);
        return person ? [{ ...request, person }] : [];
      }),
    blocked: (blocks ?? [])
      .filter((block) => block.blocker_id === user.id)
      .flatMap((block) => {
        const person = peopleById.get(block.blocked_id);
        return person ? [person] : [];
      }),
    discoverable: (discoverable ?? []).filter(
      (person) =>
        !blockedUserIds.has(person.id) &&
        !friendIds.includes(person.id) &&
        !requestedUserIds.has(person.id)
    ),
  });
}

export async function POST(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const { user, error: authError } = await currentUser(supabase);
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: {
    action?: unknown;
    userId?: unknown;
    requestId?: unknown;
    allowFriendRequests?: unknown;
    reason?: unknown;
    messageId?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action === "privacy") {
    if (typeof body.allowFriendRequests !== "boolean") {
      return NextResponse.json({ error: "Invalid privacy setting" }, { status: 400 });
    }
    const { error } = await serviceRole
      .from("profiles")
      .update({ allow_friend_requests: body.allowFriendRequests })
      .eq("id", user.id);
    if (error) {
      console.error("Could not update friend request privacy", error);
      return NextResponse.json({ error: "Could not save privacy setting" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body.action === "respond") {
    if (typeof body.requestId !== "string" || !UUID_PATTERN.test(body.requestId)) {
      return NextResponse.json({ error: "Invalid friend request" }, { status: 400 });
    }
    if (body.reason !== "accept" && body.reason !== "decline") {
      return NextResponse.json({ error: "Invalid request response" }, { status: 400 });
    }

    const { data: friendRequest, error } = await serviceRole
      .from("community_friend_requests")
      .select("id, requester_id, recipient_id")
      .eq("id", body.requestId)
      .eq("recipient_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("Could not load friend request", error);
      return NextResponse.json({ error: "Could not respond to request" }, { status: 500 });
    }
    if (!friendRequest) {
      return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    if (body.reason === "accept") {
      const [user_a, user_b] = pairFor(user.id, friendRequest.requester_id);
      const { error: friendshipError } = await serviceRole
        .from("community_friendships")
        .upsert({ user_a, user_b }, { onConflict: "user_a,user_b", ignoreDuplicates: true });
      if (friendshipError) {
        console.error("Could not accept friend request", friendshipError);
        return NextResponse.json({ error: "Could not accept friend request" }, { status: 500 });
      }
    }

    const [{ error: deleteError }, { error: notificationError }] = await Promise.all([
      serviceRole.from("community_friend_requests").delete().eq("id", friendRequest.id),
      serviceRole
        .from("community_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("actor_id", friendRequest.requester_id)
        .eq("type", "friend_request")
        .is("read_at", null),
    ]);
    if (deleteError || notificationError) {
      console.error("Could not finish friend request response", deleteError || notificationError);
      return NextResponse.json({ error: "Could not update friend request" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body.action === "cancel") {
    if (typeof body.requestId !== "string" || !UUID_PATTERN.test(body.requestId)) {
      return NextResponse.json({ error: "Invalid friend request" }, { status: 400 });
    }
    const { data: requestData, error } = await serviceRole
      .from("community_friend_requests")
      .delete()
      .eq("id", body.requestId)
      .eq("requester_id", user.id)
      .select("recipient_id")
      .maybeSingle();
    if (error) {
      console.error("Could not cancel friend request", error);
      return NextResponse.json({ error: "Could not cancel friend request" }, { status: 500 });
    }
    if (requestData) {
      const { error: notificationError } = await serviceRole
        .from("community_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", requestData.recipient_id)
        .eq("actor_id", user.id)
        .eq("type", "friend_request")
        .is("read_at", null);
      if (notificationError) {
        console.error("Could not update canceled request notification", notificationError);
        return NextResponse.json({ error: "Request canceled but notification did not update" }, { status: 500 });
      }
    }
    return NextResponse.json({ success: true });
  }

  if (typeof body.userId !== "string" || !UUID_PATTERN.test(body.userId) || body.userId === user.id) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }
  const otherId = body.userId;

  if (body.action === "request") {
    const [
      { data: target, error: targetError },
      { data: existingBlocks, error: blocksError },
      { data: existingFriendship, error: friendshipError },
      { data: existingRequest, error: requestError },
    ] =
      await Promise.all([
        serviceRole
          .from("profiles")
          .select("id, username, allow_friend_requests")
          .eq("id", otherId)
          .eq("is_public", true)
          .maybeSingle(),
        serviceRole
          .from("community_blocks")
          .select("id")
          .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${user.id})`),
        serviceRole
          .from("community_friendships")
          .select("id")
          .eq("user_a", pairFor(user.id, otherId)[0])
          .eq("user_b", pairFor(user.id, otherId)[1])
          .maybeSingle(),
        serviceRole
          .from("community_friend_requests")
          .select("id, requester_id, recipient_id")
          .or(`and(requester_id.eq.${user.id},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${user.id})`),
      ]);

    const checkError = targetError || blocksError || friendshipError || requestError;
    if (checkError) {
      console.error("Could not validate friend request", checkError);
      return NextResponse.json({ error: "Could not validate friend request" }, { status: 500 });
    }
    if (!target || !target.allow_friend_requests) {
      return NextResponse.json({ error: "This user is not accepting friend requests" }, { status: 404 });
    }
    if (existingBlocks?.length) {
      return NextResponse.json({ error: "Friend requests are unavailable for this user" }, { status: 403 });
    }
    if (existingFriendship) {
      return NextResponse.json({ error: "You are already friends" }, { status: 409 });
    }
    const pending = existingRequest?.[0];
    if (pending?.requester_id === otherId && pending.recipient_id === user.id) {
      return NextResponse.json({ error: "Accept or decline the incoming request" }, { status: 409 });
    }
    if (pending) {
      return NextResponse.json({ error: "A request is already pending" }, { status: 409 });
    }

    const { data: friendRequest, error } = await serviceRole
      .from("community_friend_requests")
      .insert({ requester_id: user.id, recipient_id: otherId })
      .select("id")
      .single();
    if (error) {
      console.error("Could not send friend request", error);
      const rateLimited = error.message.toLowerCase().includes("rate limit");
      return NextResponse.json(
        {
          error: rateLimited
            ? "You’ve sent too many friend requests. Try again later."
            : error.code === "23505"
              ? "A friend request is already pending"
              : "Could not send friend request",
        },
        { status: rateLimited ? 429 : error.code === "23505" ? 409 : 500 }
      );
    }

    const { error: notificationError } = await serviceRole
      .from("community_notifications")
      .insert({ recipient_id: otherId, actor_id: user.id, type: "friend_request" });
    if (notificationError) {
      console.error("Could not create friend request notification", notificationError);
      const { error: cleanupError } = await serviceRole
        .from("community_friend_requests")
        .delete()
        .eq("id", friendRequest.id)
        .eq("requester_id", user.id);
      if (cleanupError) {
        console.error("Could not roll back unnotified friend request", cleanupError);
      }
      return NextResponse.json({ error: "Request sent but notification failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: friendRequest.id });
  }

  if (body.action === "remove" || body.action === "block") {
    const [user_a, user_b] = pairFor(user.id, otherId);
    const [friendshipDelete, requestDelete] = await Promise.all([
      serviceRole
        .from("community_friendships")
        .delete()
        .eq("user_a", user_a)
        .eq("user_b", user_b),
      serviceRole
        .from("community_friend_requests")
        .delete()
        .or(`and(requester_id.eq.${user.id},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${user.id})`),
    ]);
    let blockError: { message: string } | null = null;
    if (body.action === "block") {
      const result = await serviceRole
        .from("community_blocks")
        .upsert(
          { blocker_id: user.id, blocked_id: otherId },
          { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true }
        );
      blockError = result.error;
    }
    const operationError =
      friendshipDelete.error || requestDelete.error || blockError;
    if (operationError) {
      console.error(`Could not ${body.action} community member`, operationError);
      return NextResponse.json({ error: `Could not ${body.action} this user` }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body.action === "unblock") {
    const { error } = await serviceRole
      .from("community_blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", otherId);
    if (error) {
      console.error("Could not unblock community member", error);
      return NextResponse.json({ error: "Could not unblock this user" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body.action === "report") {
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const messageId =
      typeof body.messageId === "string" && UUID_PATTERN.test(body.messageId)
        ? body.messageId
        : null;
    if (reason.length < 10 || reason.length > 2000) {
      return NextResponse.json({ error: "Report details must be 10-2000 characters" }, { status: 400 });
    }
    if (messageId) {
      const { data: reportedMessage, error: messageError } = await serviceRole
        .from("community_messages")
        .select("id")
        .eq("id", messageId)
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`
        )
        .maybeSingle();
      if (messageError) {
        console.error("Could not verify reported message", messageError);
        return NextResponse.json({ error: "Could not verify reported message" }, { status: 500 });
      }
      if (!reportedMessage) {
        return NextResponse.json({ error: "Reported message not found" }, { status: 404 });
      }
    }
    const { error } = await serviceRole.from("community_reports").insert({
      reporter_id: user.id,
      reported_user_id: otherId,
      message_id: messageId,
      reason,
    });
    if (error) {
      console.error("Could not submit community report", error);
      return NextResponse.json({ error: "Could not submit report" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
