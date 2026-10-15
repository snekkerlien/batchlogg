import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

type RouteContext = { params: { id: string } };

async function getOwner(
  karId: string,
  userId: string,
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"]
) {
  const { data, error } = await serviceRole
    .from("kar")
    .select("id")
    .eq("id", karId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Could not verify vessel ownership: ${error.message}`);
  return data;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    if (!(await getOwner(params.id, user.id, serviceRole))) {
      return NextResponse.json({ error: "Vessel not found." }, { status: 404 });
    }

    const { data: shares, error: sharesError } = await serviceRole
      .from("kar_contributors")
      .select("user_id")
      .eq("kar_id", params.id);
    if (sharesError) throw new Error(`Could not load contributors: ${sharesError.message}`);

    const userIds = (shares ?? []).map((share) => share.user_id);
    if (userIds.length === 0) return NextResponse.json({ contributors: [] });

    const { data: profiles, error: profilesError } = await serviceRole
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    if (profilesError) throw new Error(`Could not load contributor profiles: ${profilesError.message}`);

    return NextResponse.json({
      contributors: (profiles ?? []).map((profile) => ({
        id: profile.id,
        username: profile.username,
      })),
    });
  } catch (error) {
    console.error("Could not load vessel contributors", error);
    return NextResponse.json(
      { error: "Could not load contributors." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { userId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    typeof body.userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      body.userId
    )
  ) {
    return NextResponse.json({ error: "Choose a valid friend." }, { status: 400 });
  }

  try {
    if (!(await getOwner(params.id, user.id, serviceRole))) {
      return NextResponse.json({ error: "Vessel not found." }, { status: 404 });
    }

    if (body.userId === user.id) {
      return NextResponse.json(
        { error: "You cannot add yourself as a contributor." },
        { status: 400 }
      );
    }

    const [
      { data: forwardFriendship, error: forwardError },
      { data: reverseFriendship, error: reverseError },
      { data: blocks, error: blocksError },
      { data: profile, error: profileError },
    ] = await Promise.all([
      serviceRole
        .from("community_friendships")
        .select("user_a")
        .eq("user_a", user.id)
        .eq("user_b", body.userId)
        .maybeSingle(),
      serviceRole
        .from("community_friendships")
        .select("user_a")
        .eq("user_a", body.userId)
        .eq("user_b", user.id)
        .maybeSingle(),
      serviceRole
        .from("community_blocks")
        .select("blocker_id")
        .or(
          `and(blocker_id.eq.${user.id},blocked_id.eq.${body.userId}),and(blocker_id.eq.${body.userId},blocked_id.eq.${user.id})`
        )
        .limit(1),
      serviceRole
        .from("profiles")
        .select("id, username")
        .eq("id", body.userId)
        .maybeSingle(),
    ]);

    const queryError = forwardError || reverseError || blocksError || profileError;
    if (queryError) {
      throw new Error(`Could not verify friend: ${queryError.message}`);
    }
    if ((!forwardFriendship && !reverseFriendship) || (blocks?.length ?? 0) > 0) {
      return NextResponse.json(
        { error: "You can only share a vessel with a friend." },
        { status: 403 }
      );
    }
    if (!profile) {
      return NextResponse.json({ error: "Friend not found." }, { status: 404 });
    }

    const { error: shareError } = await serviceRole
      .from("kar_contributors")
      .upsert(
        { kar_id: params.id, user_id: profile.id },
        { onConflict: "kar_id,user_id", ignoreDuplicates: true }
      );
    if (shareError) throw new Error(`Could not add contributor: ${shareError.message}`);

    return NextResponse.json({
      contributor: { id: profile.id, username: profile.username },
    });
  } catch (error) {
    console.error("Could not add vessel contributor", error);
    return NextResponse.json(
      { error: "Could not add this contributor." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { userId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.userId !== "string") {
    return NextResponse.json({ error: "Contributor is required." }, { status: 400 });
  }

  try {
    if (!(await getOwner(params.id, user.id, serviceRole))) {
      return NextResponse.json({ error: "Vessel not found." }, { status: 404 });
    }

    const { error } = await serviceRole
      .from("kar_contributors")
      .delete()
      .eq("kar_id", params.id)
      .eq("user_id", body.userId);
    if (error) throw new Error(`Could not remove contributor: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not remove vessel contributor", error);
    return NextResponse.json(
      { error: "Could not remove this contributor." },
      { status: 500 }
    );
  }
}
