import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getUser() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { topicId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.topicId !== "string" || !UUID_PATTERN.test(body.topicId)) {
    return NextResponse.json({ error: "A valid discussion is required" }, { status: 400 });
  }

  const { serviceRole } = supabaseServer();
  const { data: topic, error: topicError } = await serviceRole
    .from("forum_topics")
    .select("id")
    .eq("id", body.topicId)
    .maybeSingle();
  if (topicError) {
    console.error("Could not verify bookmark topic", topicError);
    return NextResponse.json({ error: "Could not save discussion" }, { status: 500 });
  }
  if (!topic) return NextResponse.json({ error: "Discussion not found" }, { status: 404 });

  const { error } = await serviceRole.from("forum_bookmarks").upsert(
    { user_id: user.id, topic_id: body.topicId },
    { onConflict: "user_id,topic_id", ignoreDuplicates: true }
  );
  if (error) {
    console.error("Could not save forum bookmark", error);
    return NextResponse.json({ error: "Could not save discussion" }, { status: 500 });
  }
  return NextResponse.json({ bookmarked: true });
}

export async function DELETE(request: NextRequest) {
  const { user, error: authError } = await getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const topicId = request.nextUrl.searchParams.get("topic_id");
  if (!topicId || !UUID_PATTERN.test(topicId)) {
    return NextResponse.json({ error: "A valid discussion is required" }, { status: 400 });
  }

  const { serviceRole } = supabaseServer();
  const { error } = await serviceRole
    .from("forum_bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("topic_id", topicId);
  if (error) {
    console.error("Could not remove forum bookmark", error);
    return NextResponse.json({ error: "Could not remove saved discussion" }, { status: 500 });
  }
  return NextResponse.json({ bookmarked: false });
}
