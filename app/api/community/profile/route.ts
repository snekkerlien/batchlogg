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
      .select("id, username, avatar_url, is_public, allow_friend_requests, membership_status, award_winning_brewer, profile_banner, featured_recipe_id")
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
    return NextResponse.json(
      {
        error: "Profile is private",
        private: true,
        friendRequest,
        profile: {
          id: profile.id,
          allow_friend_requests: profile.allow_friend_requests,
          username: profile.username,
          avatar_url: profile.avatar_url,
          membership_status: profile.membership_status,
        },
      },
      { status: 403 }
    );
  }

  let stats = null;
  if (isOwner || profile.is_public) {
    let publicVesselIds: string[] | null = null;
    if (!isOwner) {
      const { data: publicVessels, error: vesselsError } = await serviceRole
        .from("kar")
        .select("id")
        .eq("user_id", profile.id)
        .eq("is_public", true);
      if (vesselsError) {
        console.error("Could not load public profile vessels", vesselsError);
        return NextResponse.json({ error: "Could not load profile statistics" }, { status: 500 });
      }
      publicVesselIds = (publicVessels ?? []).map((vessel) => vessel.id);
    }

    const [
      { count: batchCount, error: batchesError },
      { data: recipeRows, error: recipesError },
      { count: topicCount, error: topicsError },
      { count: replyCount, error: repliesError },
    ] = await Promise.all([
      isOwner
        ? serviceRole
            .from("batches")
            .select("id", { count: "exact", head: true })
            .eq("user_id", profile.id)
        : publicVesselIds?.length
          ? serviceRole
              .from("batches")
              .select("id", { count: "exact", head: true })
              .eq("user_id", profile.id)
              .in("aktivt_kar", publicVesselIds)
        : Promise.resolve({ count: 0, error: null }),
      (() => {
        let query = serviceRole
          .from("recipes")
          .select("is_public")
          .eq("user_id", profile.id);
        if (!isOwner) query = query.eq("is_public", true);
        return query;
      })(),
      serviceRole
        .from("forum_topics")
        .select("id", { count: "exact", head: true })
        .eq("author_id", profile.id),
      serviceRole
        .from("forum_replies")
        .select("id", { count: "exact", head: true })
        .eq("author_id", profile.id),
    ]);
    const statsError = batchesError || recipesError || topicsError || repliesError;
    if (statsError) {
      console.error("Could not load community profile statistics", statsError);
      return NextResponse.json({ error: "Could not load profile statistics" }, { status: 500 });
    }

    const recipes = recipeRows ?? [];

    stats = {
      totalBatches: batchCount ?? 0,
      totalRecipes: recipes.length,
      publicRecipes: recipes.filter((recipe) => recipe.is_public).length,
      forumPosts: (topicCount ?? 0) + (replyCount ?? 0),
    };
  }

  return NextResponse.json({
    profile,
    canViewContent: isOwner || profile.is_public,
    isFriend,
    friendRequest,
    stats,
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

  if (!Object.prototype.hasOwnProperty.call(body, "profileBanner") ||
    !Object.prototype.hasOwnProperty.call(body, "featuredRecipeId")) {
    return NextResponse.json({ error: "Both profile showcase fields are required" }, { status: 400 });
  }
  const banner =
    typeof body.profileBanner === "string" ? body.profileBanner.trim() : null;
  const featuredRecipeId =
    typeof body.featuredRecipeId === "string" && body.featuredRecipeId.length > 0
      ? body.featuredRecipeId
      : null;
  if (
    (body.profileBanner !== null &&
      (typeof body.profileBanner !== "string" || body.profileBanner.trim().length > 280)) ||
    (body.featuredRecipeId !== null &&
      typeof body.featuredRecipeId !== "string") ||
    (featuredRecipeId !== null &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(featuredRecipeId))
  ) {
    return NextResponse.json({ error: "Invalid profile showcase settings" }, { status: 400 });
  }
  if (featuredRecipeId) {
    const { data: recipe, error } = await serviceRole
      .from("recipes")
      .select("id")
      .eq("id", featuredRecipeId)
      .eq("user_id", user.id)
      .eq("is_public", true)
      .maybeSingle();
    if (error) {
      console.error("Could not verify featured recipe", error);
      return NextResponse.json({ error: "Could not save profile showcase" }, { status: 500 });
    }
    if (!recipe) {
      return NextResponse.json(
        { error: "Choose one of your public recipes to feature" },
        { status: 400 }
      );
    }
  }

  const { error } = await serviceRole
    .from("profiles")
    .update({
      profile_banner: banner || null,
      featured_recipe_id: featuredRecipeId,
    })
    .eq("id", user.id);
  if (error) {
    console.error("Could not save profile showcase", error);
    return NextResponse.json({ error: "Could not save profile showcase" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
