import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { serviceRole } = supabaseServer();
  const { data: topicRows, error: topicsError } = await serviceRole
    .from("forum_topics")
    .select("id, author_id, title, body, category, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (topicsError) {
    console.error("Could not load forum topics", topicsError);
    return NextResponse.json(
      { error: "Could not load forum topics" },
      { status: 500 }
    );
  }

  const topics = topicRows ?? [];
  if (topics.length === 0) {
    return NextResponse.json({ topics: [] });
  }

  const { data: replyRows, error: repliesError } = await serviceRole
    .from("forum_replies")
    .select("id, topic_id, author_id, body, created_at, updated_at")
    .in(
      "topic_id",
      topics.map((topic) => topic.id)
    )
    .order("created_at", { ascending: true });

  if (repliesError) {
    console.error("Could not load forum replies", repliesError);
    return NextResponse.json(
      { error: "Could not load forum replies" },
      { status: 500 }
    );
  }

  const replies = replyRows ?? [];
  const authorIds = Array.from(
    new Set([
      ...topics.map((topic) => topic.author_id),
      ...replies.map((reply) => reply.author_id),
    ])
  );
  const { data: profiles, error: profilesError } = await serviceRole
    .from("profiles")
    .select("id, username")
    .in("id", authorIds);

  if (profilesError) {
    console.error("Could not load forum author names", profilesError);
    return NextResponse.json(
      { error: "Could not load forum author names" },
      { status: 500 }
    );
  }

  const authors = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      { id: profile.id, username: profile.username || "Community member" },
    ])
  );
  const authorFor = (id: string) =>
    authors.get(id) ?? { id, username: "Community member" };

  return NextResponse.json({
    topics: topics.map((topic) => ({
      ...topic,
      author: authorFor(topic.author_id),
      replies: replies
        .filter((reply) => reply.topic_id === topic.id)
        .map((reply) => ({ ...reply, author: authorFor(reply.author_id) })),
    })),
  });
}
