import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { decodeForumContent } from "@/lib/community/forumContent";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!hasPermission(await getMembershipRole(supabase, user), "delete_reported_content")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { contentType?: unknown; contentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (
    (body.contentType !== "topic" && body.contentType !== "reply") ||
    typeof body.contentId !== "string" ||
    !UUID_PATTERN.test(body.contentId)
  ) {
    return NextResponse.json({ error: "Invalid forum content identifier" }, { status: 400 });
  }

  const contentTable = body.contentType === "topic" ? "forum_topics" : "forum_replies";
  const { data: content, error: contentError } = await serviceRole
    .from(contentTable)
    .select("id, body")
    .eq("id", body.contentId)
    .maybeSingle();
  if (contentError) {
    console.error("Could not load forum content for moderation", contentError);
    return NextResponse.json({ error: "Could not remove forum content" }, { status: 500 });
  }
  if (!content) {
    return NextResponse.json({ error: "Forum content not found" }, { status: 404 });
  }

  const imagePaths = decodeForumContent(content.body).imagePaths;
  let replyImagePaths: string[] = [];
  if (body.contentType === "topic") {
    const { data: replies, error: repliesError } = await serviceRole
      .from("forum_replies")
      .select("body")
      .eq("topic_id", body.contentId);
    if (repliesError) {
      console.error("Could not load replies for forum moderation", repliesError);
      return NextResponse.json({ error: "Could not remove forum content" }, { status: 500 });
    }
    replyImagePaths = (replies ?? []).flatMap((reply) =>
      decodeForumContent(reply.body).imagePaths
    );
  }

  const { error: deleteError } = await serviceRole
    .from(contentTable)
    .delete()
    .eq("id", body.contentId);
  if (deleteError) {
    console.error("Could not remove forum content", deleteError);
    return NextResponse.json({ error: "Could not remove forum content" }, { status: 500 });
  }

  const paths = [...new Set([...imagePaths, ...replyImagePaths])];
  if (paths.length) {
    const { error: storageError } = await serviceRole.storage
      .from("forum-images")
      .remove(paths);
    if (storageError) {
      console.error("Forum content was removed but its images could not be deleted", storageError);
    }
  }

  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "forum.content_removed",
      targetType: `forum_${body.contentType}`,
      targetId: body.contentId,
    }))
  ) {
    return NextResponse.json(
      { error: "Forum content was removed, but the audit log could not be updated." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
