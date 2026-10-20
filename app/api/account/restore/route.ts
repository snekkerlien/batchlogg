import { NextResponse } from "next/server";
import JSZip from "jszip";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { isAccentColor } from "@/lib/theme/accentColor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024;
const MAX_JSON_FILE_SIZE = 25 * 1024 * 1024;
const MAX_JSON_TOTAL_SIZE = 100 * 1024 * 1024;
const INSERT_BATCH_SIZE = 250;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROFILE_FIELDS = [
  "username",
  "profile_banner",
  "featured_recipe_id",
  "is_public",
  "allow_friend_requests",
  "theme_accent_color",
  "preferred_unit_system",
  "use_inventory_for_batches",
  "batch_reminders_enabled",
  "snus_is_true",
  "max_vessels",
] as const;

type JsonRecord = Record<string, unknown>;
type ArchiveData = {
  metadata: JsonRecord;
  profile: JsonRecord;
  rows: Record<string, JsonRecord[]>;
  zip: JSZip;
};

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRows(value: unknown, name: string, requireId = true): JsonRecord[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (row) =>
        isJsonRecord(row) &&
        (requireId
          ? typeof row.id === "string" && row.id.length > 0
          : typeof row.kar_id === "string" && typeof row.user_id === "string")
    )
  ) {
    throw new Error(`${name} contains invalid records`);
  }
  return value;
}

async function readJsonFile(zip: JSZip, name: string): Promise<unknown> {
  const file = zip.file(name);
  if (!file) throw new Error(`Backup is missing ${name}`);
  const text = await file.async("string");
  if (text.length > MAX_JSON_FILE_SIZE) throw new Error(`${name} is too large`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${name} is not valid JSON`);
  }
}

async function readArchive(bytes: ArrayBuffer): Promise<ArchiveData> {
  const zip = await JSZip.loadAsync(bytes);
  let totalJsonSize = 0;
  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir || !name.endsWith(".json")) continue;
    const text = await file.async("string");
    totalJsonSize += text.length;
    if (text.length > MAX_JSON_FILE_SIZE || totalJsonSize > MAX_JSON_TOTAL_SIZE) {
      throw new Error("Backup contains too much JSON data");
    }
  }

  const metadataValue = await readJsonFile(zip, "metadata.json");
  const profileValue = await readJsonFile(zip, "profile.json");
  if (!isJsonRecord(metadataValue) || !isJsonRecord(profileValue)) {
    throw new Error("Backup metadata and profile must be JSON objects");
  }
  const version = metadataValue.format_version;
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4) {
    throw new Error("Unsupported backup format. Please upload a Batchlog backup.");
  }

  const files: Record<string, string> = {
    kar: "kar.json",
    batches: "batches.json",
    recipes: "recipes.json",
    inventory_items: "inventory.json",
  };
  if (version === 2) {
    Object.assign(files, {
      batch_notes: "batch_notes.json",
      sg_readings: "sg_readings.json",
      batch_reminders: "batch_reminders.json",
      kegs: "kegs.json",
      kar_contributors: "kar_contributors.json",
      shopping_list_items: "shopping_list.json",
      forum_bookmarks: "forum_bookmarks.json",
      community_messages: "private_messages.json",
      feedback: "feedback.json",
    });
  }
  if (version === 3 || version === 4) {
    Object.assign(files, {
      batch_notes: "batch_notes.json",
      sg_readings: "sg_readings.json",
      batch_reminders: "batch_reminders.json",
      kegs: "kegs.json",
      kar_contributors: "kar_contributors.json",
      shopping_list_items: "shopping_list.json",
      forum_bookmarks: "forum_bookmarks.json",
      community_messages: "private_messages.json",
      feedback: "feedback.json",
      equipment_profiles: "equipment_profiles.json",
    });
  }
  if (version === 4) {
    files.water_chemistry_profiles = "water_chemistry_profiles.json";
  }

  const rows: Record<string, JsonRecord[]> = {};
  for (const [table, filename] of Object.entries(files)) {
    if (
      (version === 1 && table === "inventory_items" && !zip.file(filename)) ||
      (version < 3 && table === "equipment_profiles") ||
      (version < 4 && table === "water_chemistry_profiles")
    ) {
      rows[table] = [];
      continue;
    }
    rows[table] = readRows(
      await readJsonFile(zip, filename),
      filename,
      table !== "kar_contributors"
    );
  }
  if (typeof metadataValue.user_id !== "string" || !UUID_PATTERN.test(metadataValue.user_id)) {
    throw new Error("Backup is missing a valid source account ID");
  }
  return { metadata: metadataValue, profile: profileValue, rows, zip };
}

async function getArchiveBytes(
  request: Request,
  userId: string,
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"]
) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new Error("Invalid backup upload request");
    }
    const storagePath = isJsonRecord(body) ? body.storagePath : null;
    if (
      typeof storagePath !== "string" ||
      !storagePath.startsWith(`${userId}/`) ||
      !new RegExp(`^${userId}/[0-9a-f-]{36}\\.zip$`, "i").test(storagePath)
    ) {
      throw new Error("Upload a backup ZIP from your account");
    }
    const { data, error } = await serviceRole.storage
      .from("account-backups")
      .download(storagePath);
    if (error) throw new Error(`Could not read uploaded backup: ${error.message}`);
    if (data.size > MAX_ARCHIVE_SIZE) throw new Error("Backup ZIP must be 50 MB or smaller");
    return { bytes: await data.arrayBuffer(), storagePath };
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new Error("Upload a valid backup ZIP file");
  }
  const uploadedFile = formData.get("backup");
  if (!(uploadedFile instanceof File) || uploadedFile.size === 0) {
    throw new Error("Select a backup ZIP file");
  }
  if (uploadedFile.size > MAX_ARCHIVE_SIZE) {
    throw new Error("Backup ZIP must be 50 MB or smaller");
  }
  return { bytes: await uploadedFile.arrayBuffer(), storagePath: null };
}

function safeStoragePath(value: unknown, bucket: "avatars" | "batch-images") {
  if (typeof value !== "string" || !value) return null;
  let path = value;
  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`Backup contains an invalid ${bucket} URL`);
    }
    const prefix = `/storage/v1/object/public/${bucket}/`;
    const index = url.pathname.indexOf(prefix);
    if (index < 0) return null;
    try {
      path = decodeURIComponent(url.pathname.slice(index + prefix.length));
    } catch {
      throw new Error(`Backup contains an invalid ${bucket} storage path`);
    }
  }
  const parts = path.split("/");
  if (
    !path ||
    parts.some((part) => !part || part === "." || part === ".." || part.includes("\\"))
  ) {
    throw new Error(`Backup contains an unsafe ${bucket} storage path`);
  }
  return path;
}

function imageContentType(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return "application/octet-stream";
}

async function uploadArchiveImage(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  zip: JSZip,
  bucket: "avatars" | "batch-images",
  archiveName: string,
  storagePath: string
) {
  const file = zip.file(archiveName);
  if (!file) throw new Error(`Backup is missing ${archiveName}`);
  const bytes = await file.async("uint8array");
  const { error } = await serviceRole.storage.from(bucket).upload(storagePath, bytes, {
    contentType: imageContentType(storagePath),
    upsert: false,
  });
  if (error) throw new Error(`Could not restore ${bucket} file: ${error.message}`);
  return serviceRole.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
}

function safeProfileValues(profile: JsonRecord): JsonRecord {
  const values: JsonRecord = {};
  for (const field of PROFILE_FIELDS) {
    if (!(field in profile)) continue;
    const value = profile[field];
    if (field === "username") {
      if (typeof value === "string" && value.trim() && value.trim().length <= 64) {
        values[field] = value.trim();
      }
    } else if (field === "profile_banner") {
      if (value === null || (typeof value === "string" && value.length <= 500)) {
        values[field] = value;
      }
    } else if (field === "featured_recipe_id") {
      if (value === null || (typeof value === "string" && UUID_PATTERN.test(value))) {
        values[field] = value;
      }
    } else if (field === "theme_accent_color") {
      if (typeof value === "string" && isAccentColor(value)) values[field] = value;
    } else if (field === "preferred_unit_system") {
      if (value === "metric" || value === "imperial") values[field] = value;
    } else if (field === "max_vessels") {
      if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100) {
        values[field] = value;
      }
    } else if (typeof value === "boolean") {
      values[field] = value;
    }
  }
  return values;
}

async function insertRows(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  table: string,
  rows: JsonRecord[],
  userId: string,
  processed: { count: number },
  assignUserId = true
) {
  const ownedRows = rows.map((row) =>
    assignUserId ? { ...row, user_id: userId } : row
  );
  for (let offset = 0; offset < ownedRows.length; offset += INSERT_BATCH_SIZE) {
    const { error } = await serviceRole
      .from(table)
      .upsert(ownedRows.slice(offset, offset + INSERT_BATCH_SIZE), {
        onConflict: "id",
        ignoreDuplicates: true,
      });
    if (error) {
      throw new Error(
        `Restore stopped while importing ${table}. ${processed.count} records were processed before the error: ${error.message}`
      );
    }
    processed.count += Math.min(INSERT_BATCH_SIZE, ownedRows.length - offset);
  }
}

export async function POST(request: Request) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let uploadedStoragePath: string | null = null;
  try {
    const archiveInput = await getArchiveBytes(request, user.id, serviceRole);
    uploadedStoragePath = archiveInput.storagePath;
    const archive = await readArchive(archiveInput.bytes);
    const { metadata, profile, rows, zip } = archive;
    const sourceUserId = metadata.user_id as string;
    const processed = { count: 0 };
    const warnings: string[] = [];

    const batchIds = new Set(
      rows.batches.flatMap((batch) => typeof batch.id === "string" ? [batch.id] : [])
    );
    const notePaths = new Map<string, string>();
    for (const note of rows.batch_notes ?? []) {
      const batchId = typeof note.batch_id === "string" ? note.batch_id : null;
      if (!batchId || !note.image_url) continue;
      const path = safeStoragePath(note.image_url, "batch-images");
      if (!path) continue;
      if (!path.startsWith(`${batchId}/`)) {
        throw new Error("Backup contains a batch image linked to the wrong batch");
      }
      notePaths.set(path, batchId);
    }

    const declaredImagePaths = Array.isArray(metadata.batch_image_paths)
      ? metadata.batch_image_paths.filter((path): path is string => typeof path === "string")
      : [];
    for (const path of declaredImagePaths) {
      const safePath = safeStoragePath(path, "batch-images");
      if (!safePath || !notePaths.has(safePath)) {
        throw new Error("Backup contains an unlinked batch image");
      }
    }

    const restoredBatchImageUrls = new Map<string, string>();
    for (const path of declaredImagePaths) {
      const batchId = notePaths.get(path);
      if (!batchId || !batchIds.has(batchId)) {
        throw new Error("Backup batch image does not match an exported batch");
      }
      const archiveName = `files/batch-images/${path}`;
      if (!zip.file(archiveName)) throw new Error(`Backup is missing ${archiveName}`);
      const { data: existingFile, error: existingError } = await serviceRole.storage
        .from("batch-images")
        .download(path);
      let publicUrl: string;
      if (!existingError && existingFile) {
        publicUrl = serviceRole.storage.from("batch-images").getPublicUrl(path).data.publicUrl;
      } else {
        publicUrl = await uploadArchiveImage(
          serviceRole,
          zip,
          "batch-images",
          archiveName,
          path
        );
      }
      restoredBatchImageUrls.set(path, publicUrl);
    }

    let restoredAvatarUrl: string | null = null;
    const avatarPath = safeStoragePath(metadata.avatar_storage_path, "avatars");
    if (avatarPath) {
      const avatarArchiveFile = zip.file("files/profile-avatar.bin");
      if (avatarArchiveFile) {
        const extension = avatarPath.split("/").pop()?.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "";
        const targetPath = `${user.id}-${crypto.randomUUID()}${extension}`;
        restoredAvatarUrl = await uploadArchiveImage(
          serviceRole,
          zip,
          "avatars",
          "files/profile-avatar.bin",
          targetPath
        );
      } else if (metadata.format_version === 2) {
        throw new Error("Backup is missing the profile avatar file");
      }
    }

    await insertRows(serviceRole, "kar", rows.kar, user.id, processed);
    await insertRows(serviceRole, "batches", rows.batches, user.id, processed);
    await insertRows(serviceRole, "recipes", rows.recipes, user.id, processed);
    await insertRows(
      serviceRole,
      "equipment_profiles",
      rows.equipment_profiles ?? [],
      user.id,
      processed
    );
    await insertRows(
      serviceRole,
      "water_chemistry_profiles",
      rows.water_chemistry_profiles ?? [],
      user.id,
      processed
    );
    await insertRows(serviceRole, "inventory_items", rows.inventory_items, user.id, processed);

    const notes = (rows.batch_notes ?? []).map((note) => {
      const path = typeof note.image_url === "string"
        ? safeStoragePath(note.image_url, "batch-images")
        : null;
      const restoredUrl = path ? restoredBatchImageUrls.get(path) : null;
      return {
        ...note,
        user_id: user.id,
        ...(restoredUrl ? { image_url: restoredUrl } : {}),
      };
    });
    await insertRows(serviceRole, "batch_notes", notes, user.id, processed);
    await insertRows(
      serviceRole,
      "sg_readings",
      rows.sg_readings ?? [],
      user.id,
      processed,
      false
    );
    await insertRows(serviceRole, "batch_reminders", rows.batch_reminders ?? [], user.id, processed);
    await insertRows(serviceRole, "kegs", rows.kegs ?? [], user.id, processed);
    await insertRows(serviceRole, "shopping_list_items", rows.shopping_list_items ?? [], user.id, processed);

    const bookmarkRows = rows.forum_bookmarks ?? [];
    const topicIds = [...new Set(bookmarkRows.flatMap((row) =>
      typeof row.topic_id === "string" ? [row.topic_id] : []
    ))];
    const { data: availableTopics, error: topicError } = topicIds.length
      ? await serviceRole.from("forum_topics").select("id").in("id", topicIds)
      : { data: [], error: null };
    if (topicError) throw new Error(`Could not verify saved discussions: ${topicError.message}`);
    const availableTopicIds = new Set((availableTopics ?? []).map((topic) => topic.id));
    const validBookmarks = bookmarkRows.filter((row) => availableTopicIds.has(row.topic_id));
    if (validBookmarks.length !== bookmarkRows.length) {
      warnings.push("Some saved discussions were not restored because they no longer exist.");
    }
    const { data: existingBookmarks, error: existingBookmarksError } = topicIds.length
      ? await serviceRole
          .from("forum_bookmarks")
          .select("topic_id")
          .eq("user_id", user.id)
          .in("topic_id", topicIds)
      : { data: [], error: null };
    if (existingBookmarksError) {
      throw new Error(`Could not check saved discussions: ${existingBookmarksError.message}`);
    }
    const existingTopicIds = new Set((existingBookmarks ?? []).map((row) => row.topic_id));
    const missingBookmarks = validBookmarks.filter((row) => !existingTopicIds.has(row.topic_id));
    await insertRows(serviceRole, "forum_bookmarks", missingBookmarks, user.id, processed);
    if ((rows.kar_contributors ?? []).length) {
      warnings.push("Vessel-sharing access was not recreated; ask each vessel owner to share access again.");
    }

    const messages = (rows.community_messages ?? []).flatMap((message) => {
      if (
        message.sender_id !== sourceUserId &&
        message.recipient_id !== sourceUserId
      ) {
        return [];
      }
      return [{
        ...message,
        sender_id: message.sender_id === sourceUserId ? user.id : message.sender_id,
        recipient_id: message.recipient_id === sourceUserId ? user.id : message.recipient_id,
      }];
    });
    await insertRows(serviceRole, "community_messages", messages, user.id, processed, false);
    await insertRows(serviceRole, "feedback", rows.feedback ?? [], user.id, processed);

    const profileValues = safeProfileValues(profile);
    if (restoredAvatarUrl) {
      profileValues.avatar_url = restoredAvatarUrl;
    } else if (profile.avatar_url === null) {
      profileValues.avatar_url = null;
    } else if (typeof profile.avatar_url === "string" && !avatarPath) {
      profileValues.avatar_url = profile.avatar_url;
    }

    if (typeof profileValues.featured_recipe_id === "string") {
      const { data: featuredRecipe, error: featuredRecipeError } = await serviceRole
        .from("recipes")
        .select("id")
        .eq("id", profileValues.featured_recipe_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (featuredRecipeError) {
        throw new Error(`Could not verify archived featured recipe: ${featuredRecipeError.message}`);
      }
      if (!featuredRecipe) {
        delete profileValues.featured_recipe_id;
        warnings.push("The archived featured recipe was not restored because it is unavailable.");
      }
    }

    const archivedUsername = profileValues.username;
    if (typeof archivedUsername === "string") {
      const { data: conflictingProfile, error: usernameError } = await serviceRole
        .from("profiles")
        .select("id")
        .eq("username", archivedUsername)
        .neq("id", user.id)
        .maybeSingle();
      if (usernameError) throw new Error(`Could not verify archived username: ${usernameError.message}`);
      if (conflictingProfile) {
        delete profileValues.username;
        warnings.push("The archived username was kept unchanged because it is already in use.");
      }
    }

    const { error: profileError } = await serviceRole
      .from("profiles")
      .update(profileValues)
      .eq("id", user.id);
    if (profileError) {
      throw new Error(`Could not restore profile settings: ${profileError.message}`);
    }

    const warningsText = warnings.length ? ` ${warnings.join(" ")}` : "";
    return NextResponse.json({
      success: true,
      processed: processed.count,
      message: `Backup restored. Existing records were left unchanged; archived profile and settings were restored where possible.${warningsText}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid backup file";
    const status =
      /restore stopped|could not (?:restore|verify|read|remove|upload|check)/i.test(message)
        ? 500
        : 400;
    console.error("Could not restore account backup", error);
    return NextResponse.json({ error: message }, { status });
  } finally {
    if (uploadedStoragePath) {
      const { error } = await serviceRole.storage
        .from("account-backups")
        .remove([uploadedStoragePath]);
      if (error) console.error("Could not remove temporary account backup", error);
    }
  }
}
