import { NextResponse } from "next/server";
import { premiumGateResponse } from "@/lib/auth/plan";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

type RouteContext = { params: { id: string } };

async function getAccessibleVessel(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  karId: string,
  userId: string
) {
  const { data: vessel, error } = await serviceRole
    .from("kar")
    .select("id, user_id")
    .eq("id", karId)
    .maybeSingle();
  if (error) {
    console.error("Could not load vessel for activity", error);
    return { response: NextResponse.json({ error: "Could not verify vessel access" }, { status: 500 }) };
  }
  if (!vessel) return { response: NextResponse.json({ error: "Vessel not found" }, { status: 404 }) };
  if (vessel.user_id !== userId) {
    const { data: share, error: shareError } = await serviceRole
      .from("kar_contributors")
      .select("kar_id")
      .eq("kar_id", karId)
      .eq("user_id", userId)
      .maybeSingle();
    if (shareError) {
      console.error("Could not verify vessel contributor access", shareError);
      return { response: NextResponse.json({ error: "Could not verify vessel access" }, { status: 500 }) };
    }
    if (!share) return { response: NextResponse.json({ error: "Vessel not found" }, { status: 404 }) };
  }

  const denied = await premiumGateResponse(serviceRole, vessel.user_id);
  if (denied) return { response: denied };
  return { vessel };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const access = await getAccessibleVessel(serviceRole, params.id, user.id);
  if ("response" in access) return access.response;

  const { data: activities, error } = await serviceRole
    .from("kar_activity")
    .select("id, actor_id, activity_type, content, created_at")
    .eq("kar_id", params.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("Could not load shared vessel activity", error);
    return NextResponse.json({ error: "Could not load vessel activity" }, { status: 500 });
  }

  const actorIds = [...new Set((activities ?? []).map((activity) => activity.actor_id))];
  const { data: profiles, error: profilesError } = actorIds.length
    ? await serviceRole.from("profiles").select("id, username").in("id", actorIds)
    : { data: [], error: null };
  if (profilesError) {
    console.error("Could not load activity authors", profilesError);
    return NextResponse.json({ error: "Could not load activity authors" }, { status: 500 });
  }
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
  return NextResponse.json({
    activities: (activities ?? []).map((activity) => ({
      ...activity,
      username: names.get(activity.actor_id) ?? "Member",
    })),
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const access = await getAccessibleVessel(serviceRole, params.id, user.id);
  if ("response" in access) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const content = "content" in body && typeof body.content === "string"
    ? body.content.trim()
    : "";
  if (!content || content.length > 2000) {
    return NextResponse.json({ error: "Enter a shared note up to 2,000 characters" }, { status: 400 });
  }

  const { data, error } = await serviceRole
    .from("kar_activity")
    .insert({
      kar_id: params.id,
      actor_id: user.id,
      activity_type: "note",
      content,
    })
    .select("id, actor_id, activity_type, content, created_at")
    .single();
  if (error) {
    console.error("Could not save shared vessel note", error);
    return NextResponse.json({ error: "Could not save shared note" }, { status: 500 });
  }
  return NextResponse.json({ activity: { ...data, username: user.user_metadata.username ?? "Member" } }, { status: 201 });
}
