import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { contentType?: unknown; contentId?: unknown; liked?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    (body.contentType !== "topic" && body.contentType !== "reply") ||
    typeof body.contentId !== "string" ||
    !UUID_PATTERN.test(body.contentId) ||
    typeof body.liked !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid like request" }, { status: 400 });
  }

  const { data, error } = await serviceRole.rpc("set_forum_like", {
    p_user_id: user.id,
    p_content_type: body.contentType,
    p_content_id: body.contentId,
    p_liked: body.liked,
  });

  if (error) {
    if (error.code === "P0002") {
      return NextResponse.json({ error: "Forum content not found" }, { status: 404 });
    }
    console.error("Could not update forum like", error);
    return NextResponse.json({ error: "Could not update like" }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    console.error("Forum like update returned no result");
    return NextResponse.json({ error: "Could not update like" }, { status: 500 });
  }

  return NextResponse.json({
    liked: result.liked,
    likeCount: result.like_count,
  });
}
