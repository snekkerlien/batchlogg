import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import {
  decodeForumContent,
  hasForumContent,
  isForumCategory,
} from "@/lib/community/forumContent";
import { ensureCommunityAndRatingAchievementNotifications } from "@/lib/community/achievementNotifications";
import { validatePublicMentions } from "@/lib/community/mentions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getContext() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, serviceRole, user, error };
}

export async function POST(request: NextRequest) {
  const { supabase, serviceRole, user, error: authError } = await getContext();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  let role;
  try {
    role = await getMembershipRole(supabase, user);
  } catch (permissionError) {
    console.error("Could not verify forum posting permissions", permissionError);
    return NextResponse.json({ error: "Could not verify forum posting permissions" }, { status: 503 });
  }
  if (!hasPermission(role, "manage_users")) {
    const now = new Date().toISOString();
    const { data: mute, error: muteError } = await serviceRole
      .from("user_restrictions")
      .select("ends_at, reason")
      .eq("user_id", user.id)
      .eq("restriction_type", "mute")
      .is("revoked_at", null)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .maybeSingle();
    if (muteError) {
      console.error("Could not check forum posting restriction", muteError);
      return NextResponse.json({ error: "Could not check forum posting permission" }, { status: 503 });
    }
    if (mute) {
      return NextResponse.json(
        {
          error: mute.reason
            ? `Forum posting is restricted: ${mute.reason}`
            : "Forum posting is temporarily restricted.",
          endsAt: mute.ends_at,
        },
        { status: 403 }
      );
    }
  }

  let body: {
    action?: unknown;
    title?: unknown;
    category?: unknown;
    content?: unknown;
    topicId?: unknown;
    isCommunityRecipe?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action === "create_topic") {
    if (
      typeof body.title !== "string" ||
      body.title.trim().length < 3 ||
      body.title.trim().length > 150 ||
      !isForumCategory(body.category) ||
      typeof body.content !== "string" ||
      body.content.length > 20_000 ||
      !hasForumContent(body.content)
    ) {
      return NextResponse.json({ error: "Invalid discussion details" }, { status: 400 });
    }

    try {
      if (!(await validatePublicMentions(serviceRole, user.id, decodeForumContent(body.content).body))) {
        return NextResponse.json(
          { error: "Only your own currently public recipes and batches can be tagged." },
          { status: 400 }
        );
      }
    } catch (mentionError) {
      console.error("Could not verify public forum mentions", mentionError);
      return NextResponse.json({ error: "Could not verify tagged items." }, { status: 500 });
    }

    if (body.isCommunityRecipe === true) {
      const attachments = decodeForumContent(body.content).attachments;
      const recipeAttachments = attachments.filter(
        (attachment) => attachment.type === "recipe"
      );
      if (recipeAttachments.length !== 1) {
        return NextResponse.json(
          { error: "A community recipe post must include exactly one recipe." },
          { status: 400 }
        );
      }

      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .select("id")
        .eq("id", recipeAttachments[0].id)
        .eq("user_id", user.id)
        .eq("is_public", true)
        .maybeSingle();
      if (recipeError) {
        console.error("Could not verify community recipe ownership", recipeError);
        return NextResponse.json({ error: "Could not verify the selected recipe." }, { status: 500 });
      }
      if (!recipe) {
        return NextResponse.json(
          { error: "Choose one of your publicly shared recipes for the community post." },
          { status: 400 }
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_public")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) {
        console.error("Could not verify community recipe author visibility", profileError);
        return NextResponse.json({ error: "Could not verify your profile visibility." }, { status: 500 });
      }
      if (!profile?.is_public) {
        return NextResponse.json(
          { error: "Your profile must be public to post a community recipe." },
          { status: 400 }
        );
      }
    } else if (body.isCommunityRecipe !== undefined && body.isCommunityRecipe !== false) {
      return NextResponse.json({ error: "Invalid community recipe setting." }, { status: 400 });
    }

    const { error } = await supabase.from("forum_topics").insert({
      author_id: user.id,
      title: body.title.trim(),
      body: body.content,
      category: body.category,
      ...(body.isCommunityRecipe === true ? { is_community_recipe: true } : {}),
    });
    if (error) {
      console.error("Could not create forum topic", error);
      if (
        body.isCommunityRecipe === true &&
        ["42703", "PGRST204"].includes(error.code ?? "")
      ) {
        return NextResponse.json(
          { error: "Apply the community recipe database migration before posting community recipes." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: "Could not create discussion" }, { status: 500 });
    }
    try {
      await ensureCommunityAndRatingAchievementNotifications(serviceRole, user.id);
    } catch (notificationError) {
      console.error("Could not create achievement notifications after forum topic", notificationError);
    }
    return NextResponse.json({ success: true });
  }

  if (
    body.action !== "create_reply" ||
    typeof body.topicId !== "string" ||
    !UUID_PATTERN.test(body.topicId) ||
    typeof body.content !== "string" ||
    body.content.length > 20_000 ||
    !hasForumContent(body.content)
  ) {
    return NextResponse.json({ error: "Invalid reply details" }, { status: 400 });
  }

  try {
    if (!(await validatePublicMentions(serviceRole, user.id, decodeForumContent(body.content).body))) {
      return NextResponse.json(
        { error: "Only your own currently public recipes and batches can be tagged." },
        { status: 400 }
      );
    }
  } catch (mentionError) {
    console.error("Could not verify public forum mentions", mentionError);
    return NextResponse.json({ error: "Could not verify tagged items." }, { status: 500 });
  }

  const { error } = await supabase.from("forum_replies").insert({
    topic_id: body.topicId,
    author_id: user.id,
    body: body.content,
  });
  if (error) {
    console.error("Could not create forum reply", error);
    return NextResponse.json({ error: "Could not create reply" }, { status: 500 });
  }
  try {
    await ensureCommunityAndRatingAchievementNotifications(serviceRole, user.id);
  } catch (notificationError) {
    console.error("Could not create achievement notifications after forum reply", notificationError);
  }
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { supabase, serviceRole, user, error: authError } = await getContext();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { type?: unknown; id?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (
    (body.type !== "topic" && body.type !== "reply") ||
    typeof body.id !== "string" ||
    !UUID_PATTERN.test(body.id) ||
    typeof body.content !== "string" ||
    body.content.length > 20_000
  ) {
    return NextResponse.json({ error: "Invalid forum content" }, { status: 400 });
  }

  try {
    if (!(await validatePublicMentions(serviceRole, user.id, decodeForumContent(body.content).body))) {
      return NextResponse.json(
        { error: "Only your own currently public recipes and batches can be tagged." },
        { status: 400 }
      );
    }
  } catch (mentionError) {
    console.error("Could not verify edited public forum mentions", mentionError);
    return NextResponse.json({ error: "Could not verify tagged items." }, { status: 500 });
  }

  const table = body.type === "topic" ? "forum_topics" : "forum_replies";
  const { data, error } = await supabase
    .from(table)
    .update({ body: body.content })
    .eq("id", body.id)
    .eq("author_id", user.id)
    .select("id");
  if (error) {
    console.error("Could not update forum content", error);
    return NextResponse.json({ error: "Could not update forum content" }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ error: "Forum content not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { supabase, user, error: authError } = await getContext();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { type?: unknown; id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (
    (body.type !== "topic" && body.type !== "reply") ||
    typeof body.id !== "string" ||
    !UUID_PATTERN.test(body.id)
  ) {
    return NextResponse.json({ error: "Invalid forum content" }, { status: 400 });
  }

  const table = body.type === "topic" ? "forum_topics" : "forum_replies";
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("id", body.id)
    .eq("author_id", user.id)
    .select("id");
  if (error) {
    console.error("Could not delete forum content", error);
    return NextResponse.json({ error: "Could not delete forum content" }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ error: "Forum content not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
