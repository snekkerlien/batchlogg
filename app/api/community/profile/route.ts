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

  const { data: profile, error: profileError } = await serviceRole
    .from("profiles")
    .select("id, username, avatar_url, is_public")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    console.error("Could not load community profile", profileError);
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const isOwner = profile.id === user.id;
  let isFriend = false;
  if (!isOwner && !profile.is_public) {
    const [user_a, user_b] =
      user.id < profile.id ? [user.id, profile.id] : [profile.id, user.id];
    const [
      { data: friendship, error: friendshipError },
      { data: blocks, error: blocksError },
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
    ]);

    if (friendshipError || blocksError) {
      console.error(
        "Could not verify private profile access",
        friendshipError || blocksError
      );
      return NextResponse.json({ error: "Could not verify profile access" }, { status: 500 });
    }
    isFriend = !!friendship && !(blocks?.length);
  }

  if (!profile.is_public && !isOwner && !isFriend) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile,
    canViewContent: isOwner || profile.is_public,
  });
}
