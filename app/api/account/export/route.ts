import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;
const ID_CHUNK_SIZE = 100;

type JsonRecord = Record<string, unknown>;

async function getRowsByOwner(
  serviceRole: SupabaseClient,
  table: string,
  ownerColumn: string,
  userId: string
): Promise<JsonRecord[]> {
  const rows: JsonRecord[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = serviceRole
      .from(table)
      .select("*")
      .eq(ownerColumn, userId);
    query = table === "kar_contributors"
      ? query.order("kar_id")
      : query.order("id");
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not export ${table}: ${error.message}`);
    const page = (data ?? []) as JsonRecord[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function getRowsByIds(
  serviceRole: SupabaseClient,
  table: string,
  column: string,
  ids: string[]
): Promise<JsonRecord[]> {
  const rows: JsonRecord[] = [];
  for (let index = 0; index < ids.length; index += ID_CHUNK_SIZE) {
    const chunk = ids.slice(index, index + ID_CHUNK_SIZE);
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await serviceRole
        .from(table)
        .select("*")
        .in(column, chunk)
        .order("id")
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(`Could not export ${table}: ${error.message}`);
      const page = (data ?? []) as JsonRecord[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }
  return rows;
}

async function getPrivateMessages(
  serviceRole: SupabaseClient,
  userId: string
): Promise<JsonRecord[]> {
  const messages: JsonRecord[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await serviceRole
      .from("community_messages")
      .select("*")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not export private messages: ${error.message}`);
    const page = (data ?? []) as JsonRecord[];
    messages.push(...page);
    if (page.length < PAGE_SIZE) return messages;
  }
}

function getOwnedStoragePath(
  urlValue: unknown,
  bucket: "avatars" | "batch-images",
  expectedBatchId?: string,
  expectedAvatarUserId?: string
) {
  if (typeof urlValue !== "string" || !urlValue) return null;
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    throw new Error(`A ${bucket} file has an invalid URL`);
  }

  const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const prefix = `/storage/v1/object/public/${bucket}/`;
  if (url.origin !== projectUrl.origin || !url.pathname.startsWith(prefix)) return null;

  let path: string;
  try {
    path = decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    throw new Error(`A ${bucket} file has an invalid storage path`);
  }
  const parts = path.split("/");
  if (
    !path ||
    parts.some((part) => !part || part === "." || part === ".." || part.includes("\\"))
  ) {
    throw new Error(`A ${bucket} file has an unsafe storage path`);
  }
  if (
    bucket === "avatars" &&
    expectedAvatarUserId &&
    !path.startsWith(`${expectedAvatarUserId}-`)
  ) {
    return null;
  }
  if (expectedBatchId && !path.startsWith(`${expectedBatchId}/`)) {
    throw new Error("A batch note image is not owned by its batch");
  }
  return path;
}

async function addStorageFile(
  serviceRole: SupabaseClient,
  zip: JSZip,
  bucket: "avatars" | "batch-images",
  path: string,
  archivePath: string
) {
  const { data, error } = await serviceRole.storage.from(bucket).download(path);
  if (error) throw new Error(`Could not export ${bucket} file: ${error.message}`);
  zip.file(archivePath, await data.arrayBuffer());
}

export async function GET() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { data: profile, error: profileError } = await serviceRole
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (profileError) throw new Error(`Could not export profile: ${profileError.message}`);

    const [
      batches,
      vessels,
      recipes,
      inventory,
      equipmentProfiles,
      waterChemistryProfiles,
      notes,
      reminders,
      contributors,
      shoppingList,
      bookmarks,
      feedback,
      messages,
    ] = await Promise.all([
      getRowsByOwner(serviceRole, "batches", "user_id", user.id),
      getRowsByOwner(serviceRole, "kar", "user_id", user.id),
      getRowsByOwner(serviceRole, "recipes", "user_id", user.id),
      getRowsByOwner(serviceRole, "inventory_items", "user_id", user.id),
      getRowsByOwner(serviceRole, "equipment_profiles", "user_id", user.id),
      getRowsByOwner(serviceRole, "water_chemistry_profiles", "user_id", user.id),
      getRowsByOwner(serviceRole, "batch_notes", "user_id", user.id),
      getRowsByOwner(serviceRole, "batch_reminders", "user_id", user.id),
      getRowsByOwner(serviceRole, "kar_contributors", "user_id", user.id),
      getRowsByOwner(serviceRole, "shopping_list_items", "user_id", user.id),
      getRowsByOwner(serviceRole, "forum_bookmarks", "user_id", user.id),
      getRowsByOwner(serviceRole, "feedback", "user_id", user.id),
      getPrivateMessages(serviceRole, user.id),
    ]);
    const batchIds = batches.flatMap((batch) =>
      typeof batch.id === "string" ? [batch.id] : []
    );
    const readings = await getRowsByIds(serviceRole, "sg_readings", "batch_id", batchIds);

    const zip = new JSZip();
    const avatarPath = getOwnedStoragePath(profile.avatar_url, "avatars", undefined, user.id);
    const batchImagePaths = [
      ...new Set(
        notes.flatMap((note) => {
          const batchId = typeof note.batch_id === "string" ? note.batch_id : null;
          if (!batchId || !note.image_url) return [];
          const path = getOwnedStoragePath(note.image_url, "batch-images", batchId);
          return path ? [path] : [];
        })
      ),
    ];

    const entries: [string, unknown][] = [
      ["profile.json", profile],
      ["batches.json", batches],
      ["kar.json", vessels],
      ["recipes.json", recipes],
      ["inventory.json", inventory],
      ["equipment_profiles.json", equipmentProfiles],
      ["water_chemistry_profiles.json", waterChemistryProfiles],
      ["batch_notes.json", notes],
      ["sg_readings.json", readings],
      ["batch_reminders.json", reminders],
      ["kar_contributors.json", contributors],
      ["shopping_list.json", shoppingList],
      ["forum_bookmarks.json", bookmarks],
      ["private_messages.json", messages],
      ["feedback.json", feedback],
    ];
    for (const [name, value] of entries) {
      zip.file(name, JSON.stringify(value, null, 2));
    }
    zip.file(
      "metadata.json",
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          format_version: 4,
          username: profile.username ?? "unknown",
          user_id: user.id,
          email: user.email ?? null,
          avatar_storage_path: avatarPath,
          batch_image_paths: batchImagePaths,
          included: [
            "profile",
            "batches",
            "vessels",
            "recipes",
            "inventory",
            "equipment_profiles",
            "water_chemistry_profiles",
            "batch_notes",
            "sg_readings",
            "batch_reminders",
            "vessel_contributors",
            "shopping_list",
            "forum_bookmarks",
            "private_messages",
            "feedback",
            "profile_avatar",
            "batch_note_images",
          ],
          excluded: ["passwords", "authentication_credentials", "forum_posts", "forum_replies", "friendships", "community_uploads"],
        },
        null,
        2
      )
    );

    if (avatarPath) {
      await addStorageFile(serviceRole, zip, "avatars", avatarPath, "files/profile-avatar.bin");
    }
    for (const path of batchImagePaths) {
      await addStorageFile(
        serviceRole,
        zip,
        "batch-images",
        path,
        `files/batch-images/${path}`
      );
    }

    const archive = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
    if (archive.byteLength > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Your backup is larger than the 50 MB restore limit. Remove some large images and try again." },
        { status: 413 }
      );
    }
    const filename = `${String(profile.username || "account").replace(/[^a-z0-9_-]/gi, "_")}-batchlog-backup.zip`;
    return new NextResponse(archive, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Could not export complete account data", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not export account data",
      },
      { status: 500 }
    );
  }
}
