import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { hasPremiumAccess, premiumGateResponse } from "@/lib/auth/plan";

type RouteContext = { params: { id: string } };

async function recordContributorActivity(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  karId: string,
  actorId: string,
  activityType: "contributor_added" | "contributor_removed",
  content: string
) {
  const { error } = await serviceRole.from("kar_activity").insert({
    kar_id: karId,
    actor_id: actorId,
    activity_type: activityType,
    content,
  });
  if (error) {
    console.error("Could not record vessel contributor activity", error);
    return false;
  }
  return true;
}

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
    const canShare = await hasPremiumAccess(serviceRole, user.id);
    if (userIds.length === 0) {
      return NextResponse.json({ contributors: [], canShare });
    }

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
      canShare,
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
  const accessDenied = await premiumGateResponse(serviceRole, user.id);
  if (accessDenied) return accessDenied;

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

    const { data: insertedShares, error: shareError } = await serviceRole
      .from("kar_contributors")
      .upsert(
        { kar_id: params.id, user_id: profile.id },
        { onConflict: "kar_id,user_id", ignoreDuplicates: true }
      )
      .select("user_id");
    if (shareError) throw new Error(`Could not add contributor: ${shareError.message}`);

    const activityRecorded =
      !insertedShares?.length ||
      await recordContributorActivity(
        serviceRole,
        params.id,
        user.id,
        "contributor_added",
        `Added ${profile.username} as a vessel contributor`
      );
    return NextResponse.json({
      contributor: { id: profile.id, username: profile.username },
      ...(!activityRecorded && {
        activityWarning: "Contributor added, but the activity history could not be updated.",
      }),
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

  let body: { userId?: unknown; leave?: unknown };
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    body = parsed as { userId?: unknown; leave?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    if (body.leave === true) {
      if (await getOwner(params.id, user.id, serviceRole)) {
        return NextResponse.json(
          { error: "Vessel owners cannot leave their own vessel." },
          { status: 409 }
        );
      }

      const { data, error } = await serviceRole
        .from("kar_contributors")
        .delete()
        .eq("kar_id", params.id)
        .eq("user_id", user.id)
        .select("kar_id")
        .maybeSingle();
      if (error) throw new Error(`Could not leave shared vessel: ${error.message}`);
      if (!data) {
        return NextResponse.json(
          { error: "You are not a contributor to this vessel." },
          { status: 404 }
        );
      }

      const activityRecorded = await recordContributorActivity(
        serviceRole,
        params.id,
        user.id,
        "contributor_removed",
        `${user.user_metadata.username ?? "A contributor"} left the vessel`
      );
      return NextResponse.json({
        success: true,
        ...(!activityRecorded && {
          activityWarning: "You left the vessel, but the activity history could not be updated.",
        }),
      });
    }

    if (
      typeof body.userId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.userId
      )
    ) {
      return NextResponse.json({ error: "Contributor is required." }, { status: 400 });
    }
    if (!(await getOwner(params.id, user.id, serviceRole))) {
      return NextResponse.json({ error: "Vessel not found." }, { status: 404 });
    }

    const [
      { data: contributorProfile, error: profileError },
      { data: removed, error },
    ] = await Promise.all([
      serviceRole.from("profiles").select("username").eq("id", body.userId).maybeSingle(),
      serviceRole
      .from("kar_contributors")
      .delete()
      .eq("kar_id", params.id)
      .eq("user_id", body.userId)
      .select("user_id")
      .maybeSingle(),
    ]);
    if (profileError) throw new Error(`Could not load contributor profile: ${profileError.message}`);
    if (error) throw new Error(`Could not remove contributor: ${error.message}`);

    const activityRecorded =
      !removed ||
      await recordContributorActivity(
        serviceRole,
        params.id,
        user.id,
        "contributor_removed",
        `Removed ${contributorProfile?.username ?? "a contributor"} from the vessel`
      );
    return NextResponse.json({
      success: true,
      ...(!activityRecorded && {
        activityWarning: "Contributor removed, but the activity history could not be updated.",
      }),
    });
  } catch (error) {
    console.error("Could not remove vessel contributor", error);
    return NextResponse.json(
      { error: "Could not remove this contributor." },
      { status: 500 }
    );
  }
}
