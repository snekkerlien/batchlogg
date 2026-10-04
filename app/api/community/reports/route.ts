import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPORT_CATEGORIES = new Set([
  "spam",
  "harassment",
  "inappropriate",
  "other",
]);
const CONTENT_TYPES = new Set([
  "post",
  "reply",
  "message",
  "recipe",
  "batch",
  "profile",
]);
const MAX_EVIDENCE_FILES = 3;
const MAX_EVIDENCE_FILE_SIZE = 5 * 1024 * 1024;
const MAX_MULTIPART_SIZE = MAX_EVIDENCE_FILES * MAX_EVIDENCE_FILE_SIZE + 64 * 1024;
const EVIDENCE_MIME_TYPES = new Map([
  [
    "image/jpeg",
    {
      extension: "jpg",
      signature: (bytes: Uint8Array) =>
        bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    },
  ],
  [
    "image/png",
    {
      extension: "png",
      signature: (bytes: Uint8Array) =>
        bytes.subarray(0, 8).join(",") === "137,80,78,71,13,10,26,10",
    },
  ],
  [
    "image/webp",
    {
      extension: "webp",
      signature: (bytes: Uint8Array) =>
        bytes.length >= 12 &&
        String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP",
    },
  ],
]);

class ReportUploadLimitError extends Error {}

async function parseBoundedMultipart(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing multipart request body");

  const chunks: Uint8Array[] = [];
  let totalSize = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_MULTIPART_SIZE) {
        try {
          await reader.cancel();
        } catch (cancelError) {
          console.error("Could not stop oversized report upload", cancelError);
        }
        throw new ReportUploadLimitError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const contentType = request.headers.get("content-type");
  if (!contentType) throw new Error("Missing multipart content type");
  return new Request(request.url, {
    method: request.method,
    headers: { "content-type": contentType },
    body: bytes,
  }).formData();
}

export async function POST(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  const evidence: File[] = [];
  try {
    const isMultipart = request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("multipart/form-data");
    let normalizedBody: unknown;
    if (isMultipart) {
      const form = await parseBoundedMultipart(request);
      for (const entry of form.getAll("evidence")) {
        if (typeof entry !== "string") evidence.push(entry);
      }
      normalizedBody = {
        contentType: form.get("contentType"),
        contentId: form.get("contentId"),
        contextUrl: form.get("contextUrl"),
        category: form.get("category"),
        reason: form.get("reason"),
      };
    } else {
      normalizedBody = await request.json();
    }
    if (
      typeof normalizedBody !== "object" ||
      normalizedBody === null ||
      Array.isArray(normalizedBody)
    ) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = normalizedBody as Record<string, unknown>;
  } catch (parseError) {
    if (parseError instanceof ReportUploadLimitError) {
      return NextResponse.json({ error: "Report evidence exceeds the upload limit" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid report request" }, { status: 400 });
  }

  const type = body.contentType;
  const contentId = body.contentId;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const category = typeof body.category === "string" ? body.category : "";
  const contextUrl =
    typeof body.contextUrl === "string" &&
    body.contextUrl.startsWith("/") &&
    !body.contextUrl.startsWith("//")
      ? body.contextUrl.slice(0, 500)
      : null;

  if (
    typeof type !== "string" ||
    !CONTENT_TYPES.has(type) ||
    typeof contentId !== "string" ||
    !UUID_PATTERN.test(contentId) ||
    !REPORT_CATEGORIES.has(category) ||
    reason.length < 10 ||
    reason.length > 2000
  ) {
    return NextResponse.json({ error: "Invalid report details" }, { status: 400 });
  }
  if (evidence.length > MAX_EVIDENCE_FILES) {
    return NextResponse.json(
      { error: `You can attach up to ${MAX_EVIDENCE_FILES} screenshots` },
      { status: 400 }
    );
  }
  const preparedEvidence = await Promise.all(
    evidence.map(async (file) => {
      const format = EVIDENCE_MIME_TYPES.get(file.type);
      if (
        !format ||
        file.size === 0 ||
        file.size > MAX_EVIDENCE_FILE_SIZE
      ) {
        return null;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!format.signature(bytes)) return null;
      return { file, bytes, extension: format.extension };
    })
  );
  if (preparedEvidence.some((item) => item === null)) {
    return NextResponse.json(
      { error: "Evidence must be valid JPEG, PNG, or WebP images smaller than 5 MB" },
      { status: 400 }
    );
  }

  let reportedUserId: string | null = null;
  let messageId: string | null = null;
  let snapshot: Record<string, unknown> | null = null;

  if (type === "post") {
    const { data, error } = await serviceRole
      .from("forum_topics")
      .select("id, author_id, title, body")
      .eq("id", contentId)
      .maybeSingle();
    if (error) {
      console.error("Could not load reported forum topic", error);
      return NextResponse.json({ error: "Could not verify reported content" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Reported content not found" }, { status: 404 });
    reportedUserId = data.author_id;
    snapshot = { title: data.title, body: data.body.slice(0, 5000) };
  } else if (type === "reply") {
    const { data, error } = await serviceRole
      .from("forum_replies")
      .select("id, author_id, body")
      .eq("id", contentId)
      .maybeSingle();
    if (error) {
      console.error("Could not load reported forum reply", error);
      return NextResponse.json({ error: "Could not verify reported content" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Reported content not found" }, { status: 404 });
    reportedUserId = data.author_id;
    snapshot = { body: data.body.slice(0, 5000) };
  } else if (type === "message") {
    const { data, error } = await serviceRole
      .from("community_messages")
      .select("id, sender_id, recipient_id, body")
      .eq("id", contentId)
      .eq("recipient_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("Could not load reported private message", error);
      return NextResponse.json({ error: "Could not verify reported content" }, { status: 500 });
    }
    if (!data || data.sender_id === user.id) {
      return NextResponse.json({ error: "Reported message not found" }, { status: 404 });
    }
    reportedUserId = data.sender_id;
    messageId = data.id;
    snapshot = { body: data.body.slice(0, 5000) };
  } else if (type === "recipe") {
    const { data, error } = await serviceRole
      .from("recipes")
      .select("id, user_id, name, type, is_public")
      .eq("id", contentId)
      .maybeSingle();
    if (error) {
      console.error("Could not load reported recipe", error);
      return NextResponse.json({ error: "Could not verify reported content" }, { status: 500 });
    }
    if (!data || !data.is_public) {
      return NextResponse.json({ error: "Reported recipe not found" }, { status: 404 });
    }
    reportedUserId = data.user_id;
    snapshot = { name: data.name, type: data.type };
  } else if (type === "batch") {
    const { data, error } = await serviceRole
      .from("batches")
      .select("id, user_id, aktivt_kar, name, status, notes")
      .eq("id", contentId)
      .maybeSingle();
    if (error) {
      console.error("Could not load reported batch", error);
      return NextResponse.json({ error: "Could not verify reported content" }, { status: 500 });
    }
    if (!data || !data.user_id || !data.aktivt_kar) {
      return NextResponse.json({ error: "Reported batch not found" }, { status: 404 });
    }
    const { data: publicVessel, error: vesselError } = await serviceRole
      .from("kar")
      .select("id")
      .eq("id", data.aktivt_kar)
      .eq("user_id", data.user_id)
      .eq("is_public", true)
      .limit(1)
      .maybeSingle();
    if (vesselError) {
      console.error("Could not verify reported batch visibility", vesselError);
      return NextResponse.json({ error: "Could not verify reported content" }, { status: 500 });
    }
    if (!publicVessel) return NextResponse.json({ error: "Reported batch not found" }, { status: 404 });
    reportedUserId = data.user_id;
    snapshot = { name: data.name, status: data.status, notes: data.notes?.slice(0, 5000) };
  } else {
    const { data, error } = await serviceRole
      .from("profiles")
      .select("id, username, is_public")
      .eq("id", contentId)
      .maybeSingle();
    if (error) {
      console.error("Could not load reported profile", error);
      return NextResponse.json({ error: "Could not verify reported content" }, { status: 500 });
    }
    if (!data || !data.is_public) {
      if (!data) {
        return NextResponse.json({ error: "Reported profile not found" }, { status: 404 });
      }
      const [user_a, user_b] =
        user.id < data.id ? [user.id, data.id] : [data.id, user.id];
      const { data: friendship, error: friendshipError } = await serviceRole
        .from("community_friendships")
        .select("id")
        .eq("user_a", user_a)
        .eq("user_b", user_b)
        .maybeSingle();
      if (friendshipError) {
        console.error("Could not verify private profile report access", friendshipError);
        return NextResponse.json({ error: "Could not verify reported profile" }, { status: 500 });
      }
      if (!friendship) {
        return NextResponse.json({ error: "Reported profile not found" }, { status: 404 });
      }
    }
    reportedUserId = data.id;
    snapshot = { username: data.username };
  }

  if (!reportedUserId || reportedUserId === user.id) {
    return NextResponse.json({ error: "You cannot report your own content" }, { status: 400 });
  }

  const evidencePaths: string[] = [];
  for (const item of preparedEvidence) {
    if (!item) continue;
    const path = `${user.id}/${crypto.randomUUID()}.${item.extension}`;
    const { error: uploadError } = await serviceRole.storage
      .from("community-report-evidence")
      .upload(path, item.bytes, {
        contentType: item.file.type,
        upsert: false,
      });
    if (uploadError) {
      console.error("Could not store report evidence", uploadError);
      if (evidencePaths.length) {
        const { error: cleanupError } = await serviceRole.storage
          .from("community-report-evidence")
          .remove(evidencePaths);
        if (cleanupError) console.error("Could not clean up partial report evidence", cleanupError);
      }
      return NextResponse.json({ error: "Could not store report evidence" }, { status: 500 });
    }
    evidencePaths.push(path);
  }

  const { error } = await serviceRole.from("community_reports").insert({
    reporter_id: user.id,
    reported_user_id: reportedUserId,
    message_id: messageId,
    content_type: type,
    content_id: contentId,
    category,
    context_url: contextUrl,
    content_snapshot: snapshot,
    attachments: evidencePaths,
    reason,
  });
  if (error) {
    console.error("Could not submit community report", error);
    if (evidencePaths.length) {
      const { error: cleanupError } = await serviceRole.storage
        .from("community-report-evidence")
        .remove(evidencePaths);
      if (cleanupError) console.error("Could not clean up unlinked report evidence", cleanupError);
    }
    return NextResponse.json({ error: "Could not submit report" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
