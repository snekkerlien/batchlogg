import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import {
  decodeForumContent,
  type ForumAttachmentRef,
} from "@/lib/community/forumContent";

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
  const decodedTopics = topics.map((topic) => ({
    topic,
    content: decodeForumContent(topic.body),
  }));
  const decodedReplies = replies.map((reply) => ({
    reply,
    content: decodeForumContent(reply.body),
  }));
  const attachmentRefs = [
    ...decodedTopics.flatMap(({ content }) => content.attachments),
    ...decodedReplies.flatMap(({ content }) => content.attachments),
  ];
  const recipeIds = [...new Set(
    attachmentRefs.filter((attachment) => attachment.type === "recipe").map((attachment) => attachment.id)
  )];
  const batchIds = [...new Set(
    attachmentRefs.filter((attachment) => attachment.type === "batch").map((attachment) => attachment.id)
  )];
  const [
    { data: recipes, error: recipesError },
    { data: batches, error: batchesError },
  ] = await Promise.all([
    recipeIds.length
      ? serviceRole
          .from("recipes")
          .select("id, name, is_public")
          .in("id", recipeIds)
          .eq("is_public", true)
      : { data: [], error: null },
    batchIds.length
      ? serviceRole
          .from("batches")
          .select("id, user_id, name, aktivt_kar, status")
          .in("id", batchIds)
          .in("status", ["Aktiv", "Sekundær", "secondary"])
      : { data: [], error: null },
  ]);
  if (recipesError || batchesError) {
    console.error("Could not load forum attachments", recipesError || batchesError);
    return NextResponse.json({ error: "Could not load forum attachments" }, { status: 500 });
  }

  const activeBatches = (batches ?? []).filter(
    (batch) => batch.user_id && batch.aktivt_kar
  );
  const vesselIds = [...new Set(activeBatches.map((batch) => batch.aktivt_kar!))];
  const ownerIds = [...new Set(activeBatches.map((batch) => batch.user_id!))];
  const [{ data: publicVessels, error: vesselsError }, { data: batchOwners, error: ownersError }] =
    await Promise.all([
      vesselIds.length
        ? serviceRole
            .from("kar")
            .select("id, user_id, is_public")
            .in("id", vesselIds)
            .eq("is_public", true)
        : { data: [], error: null },
      ownerIds.length
        ? serviceRole.from("profiles").select("id, username").in("id", ownerIds)
        : { data: [], error: null },
    ]);
  if (vesselsError || ownersError) {
    console.error("Could not verify public forum batch attachments", vesselsError || ownersError);
    return NextResponse.json({ error: "Could not load forum attachments" }, { status: 500 });
  }

  const recipesById = new Map((recipes ?? []).map((recipe) => [recipe.id, recipe]));
  const publicVesselsById = new Map((publicVessels ?? []).map((vessel) => [vessel.id, vessel]));
  const batchOwnersById = new Map((batchOwners ?? []).map((owner) => [owner.id, owner]));
  const batchesById = new Map(activeBatches.map((batch) => [batch.id, batch]));
  const attachmentFor = (reference: ForumAttachmentRef) => {
    if (reference.type === "recipe") {
      const recipe = recipesById.get(reference.id);
      return {
        ...reference,
        name: recipe?.name ?? "Recipe no longer available",
        url: recipe ? `/my-recipes/${recipe.id}` : null,
      };
    }

    const batch = batchesById.get(reference.id);
    const vessel = batch?.aktivt_kar
      ? publicVesselsById.get(batch.aktivt_kar)
      : null;
    const owner = batch?.user_id ? batchOwnersById.get(batch.user_id) : null;
    return {
      ...reference,
      name: batch && vessel ? batch.name : "Batch no longer available",
      url:
        batch && vessel && owner?.username
          ? `/members/${encodeURIComponent(owner.username)}/${vessel.id}`
          : null,
    };
  };

  const authorIds = Array.from(
    new Set([
      ...topics.map((topic) => topic.author_id),
      ...replies.map((reply) => reply.author_id),
    ])
  );
  const { data: profiles, error: profilesError } = await serviceRole
    .from("profiles")
    .select("id, username, avatar_url")
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
      {
        id: profile.id,
        username: profile.username || "Community member",
        profileUsername: profile.username || null,
        avatar_url: profile.avatar_url || null,
      },
    ])
  );
  const authorFor = (id: string) =>
    authors.get(id) ?? {
      id,
      username: "Community member",
      profileUsername: null,
      avatar_url: null,
    };
  const imageFor = (path: string, authorId: string) => {
    if (!path.startsWith(`${authorId}/`)) return null;
    return {
      path,
      url: serviceRole.storage.from("forum-images").getPublicUrl(path).data.publicUrl,
    };
  };

  return NextResponse.json({
    topics: decodedTopics.map(({ topic, content }) => {
      return {
        ...topic,
        body: content.body,
        images: content.imagePaths
          .map((path) => imageFor(path, topic.author_id))
          .filter((image) => image !== null),
        attachments: content.attachments.map(attachmentFor),
        author: authorFor(topic.author_id),
        replies: decodedReplies
          .filter(({ reply }) => reply.topic_id === topic.id)
          .map(({ reply, content: replyContent }) => {
            return {
              ...reply,
              body: replyContent.body,
              images: replyContent.imagePaths
                .map((path) => imageFor(path, reply.author_id))
                .filter((image) => image !== null),
              attachments: replyContent.attachments.map(attachmentFor),
              author: authorFor(reply.author_id),
            };
          }),
      };
    }),
  });
}
