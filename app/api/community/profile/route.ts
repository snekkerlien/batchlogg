import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const username = request.nextUrl.searchParams.get("username")?.trim();
  if (!username || username.length > 64) {
    return NextResponse.json({ error: "Valid username is required" }, { status: 400 });
  }

  const usernames = [username];
  try {
    const decodedUsername = decodeURIComponent(username);
    if (decodedUsername !== username && decodedUsername.length <= 64) {
      usernames.push(decodedUsername);
    }
  } catch {
    // Keep the supplied username as-is when it is not a valid encoded value.
  }

  let profile = null;
  let profileError = null;
  for (const candidate of usernames) {
    const result = await serviceRole
      .from("profiles")
      .select("id, username, avatar_url, is_public, allow_friend_requests")
      .eq("username", candidate)
      .maybeSingle();

    if (result.error) {
      profileError = result.error;
      break;
    }
    if (result.data) {
      profile = result.data;
      break;
    }
  }

  if (profileError) {
    console.error("Could not load community profile", profileError);
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const isOwner = profile.id === user.id;
  let isFriend = false;
  let friendRequest: { id: string; status: "sent" | "received" } | null = null;
  if (!isOwner) {
    const [user_a, user_b] =
      user.id < profile.id ? [user.id, profile.id] : [profile.id, user.id];
    const [
      { data: friendship, error: friendshipError },
      { data: blocks, error: blocksError },
      { data: requests, error: requestsError },
    ] = await Promise.all([
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
          `and(blocker_id.eq.${user.id},blocked_id.eq.${profile.id}),and(blocker_id.eq.${profile.id},blocked_id.eq.${user.id})`
        ),
      serviceRole
        .from("community_friend_requests")
        .select("id, requester_id, recipient_id")
        .or(
          `and(requester_id.eq.${user.id},recipient_id.eq.${profile.id}),and(requester_id.eq.${profile.id},recipient_id.eq.${user.id})`
        ),
    ]);

    if (friendshipError || blocksError || requestsError) {
      console.error(
        "Could not verify community profile relationship",
        friendshipError || blocksError || requestsError
      );
      return NextResponse.json({ error: "Could not verify profile access" }, { status: 500 });
    }
    isFriend = !!friendship && !(blocks?.length);
    const pendingRequest = requests?.[0];
    if (pendingRequest) {
      friendRequest = {
        id: pendingRequest.id,
        status: pendingRequest.requester_id === user.id ? "sent" : "received",
      };
    }
  }

  if (!profile.is_public && !isOwner && !isFriend) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile,
    canViewContent: isOwner || profile.is_public,
    isFriend,
    friendRequest,
  });
}
