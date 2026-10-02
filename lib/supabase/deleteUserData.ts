import type { SupabaseClient } from "@supabase/supabase-js";

const STORAGE_PAGE_SIZE = 1000;
const STORAGE_REMOVE_BATCH_SIZE = 100;
const DATABASE_BATCH_SIZE = 100;

async function getOwnedRowIds(
  serviceRole: SupabaseClient,
  table: string,
  ownerColumn: string,
  userId: string,
): Promise<string[]> {
  const ids: string[] = [];

  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await serviceRole
      .from(table)
      .select("id")
      .eq(ownerColumn, userId)
      .range(offset, offset + STORAGE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not load user records from ${table}: ${error.message}`);
    }

    const rows = data ?? [];
    ids.push(...rows.map((row) => row.id));
    if (rows.length < STORAGE_PAGE_SIZE) break;
  }

  return ids;
}

async function listStorageFiles(
  serviceRole: SupabaseClient,
  bucket: string,
  folder: string,
): Promise<string[]> {
  const files: string[] = [];

  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await serviceRole.storage
      .from(bucket)
      .list(folder, { limit: STORAGE_PAGE_SIZE, offset });

    if (error) {
      throw new Error(`Could not list ${bucket} storage: ${error.message}`);
    }

    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${folder}/${entry.name}`;
      if (entry.id === null) {
        files.push(...(await listStorageFiles(serviceRole, bucket, path)));
      } else {
        files.push(path);
      }
    }

    if (entries.length < STORAGE_PAGE_SIZE) break;
  }

  return files;
}

async function removeStorageFiles(
  serviceRole: SupabaseClient,
  bucket: string,
  paths: string[],
) {
  for (let offset = 0; offset < paths.length; offset += STORAGE_REMOVE_BATCH_SIZE) {
    const { error } = await serviceRole.storage
      .from(bucket)
      .remove(paths.slice(offset, offset + STORAGE_REMOVE_BATCH_SIZE));

    if (error) {
      throw new Error(`Could not remove ${bucket} files: ${error.message}`);
    }
  }
}

async function getUserAvatarPath(
  serviceRole: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: profile, error } = await serviceRole
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load user profile: ${error.message}`);
  }

  if (!profile?.avatar_url) return null;

  let avatarUrl: URL;
  try {
    avatarUrl = new URL(profile.avatar_url);
  } catch {
    throw new Error("User profile contains an invalid avatar URL");
  }

  const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const storagePrefix = "/storage/v1/object/public/avatars/";

  if (
    avatarUrl.origin !== projectUrl.origin ||
    !avatarUrl.pathname.startsWith(storagePrefix)
  ) {
    return null;
  }

  try {
    return decodeURIComponent(avatarUrl.pathname.slice(storagePrefix.length));
  } catch {
    throw new Error("User profile contains an invalid avatar storage path");
  }
}

async function getOwnedBatchIds(
  serviceRole: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const ids: string[] = [];

  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await serviceRole
      .from("batches")
      .select("id")
      .eq("user_id", userId)
      .range(offset, offset + STORAGE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not load user batches: ${error.message}`);
    }

    const batches = data ?? [];
    ids.push(...batches.map((batch) => batch.id));
    if (batches.length < STORAGE_PAGE_SIZE) break;
  }

  return ids;
}

async function getUserNoteImagePaths(
  serviceRole: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const paths: string[] = [];
  const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const storagePrefix = "/storage/v1/object/public/batch-images/";

  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await serviceRole
      .from("batch_notes")
      .select("batch_id, image_url")
      .eq("user_id", userId)
      .range(offset, offset + STORAGE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not load user note images: ${error.message}`);
    }

    const notes = data ?? [];
    for (const note of notes) {
      if (!note.image_url) continue;

      let imageUrl: URL;
      try {
        imageUrl = new URL(note.image_url);
      } catch {
        throw new Error("User note contains an invalid image URL");
      }

      if (
        imageUrl.origin === projectUrl.origin &&
        imageUrl.pathname.startsWith(storagePrefix)
      ) {
        try {
          const path = decodeURIComponent(
            imageUrl.pathname.slice(storagePrefix.length),
          );
          const parts = path.split("/");
          if (
            path.startsWith(`${note.batch_id}/`) &&
            !parts.some(
              (part) => !part || part === "." || part === ".." || part.includes("\\"),
            )
          ) {
            paths.push(path);
          }
        } catch {
          throw new Error("User note contains an invalid image storage path");
        }
      }
    }

    if (notes.length < STORAGE_PAGE_SIZE) break;
  }

  return paths;
}

async function deleteRows(
  serviceRole: SupabaseClient,
  table: string,
  column: string,
  value: string,
) {
  const { error } = await serviceRole.from(table).delete().eq(column, value);
  if (error) {
    throw new Error(`Could not delete user data from ${table}: ${error.message}`);
  }
}

async function deleteRowsByIds(
  serviceRole: SupabaseClient,
  table: string,
  column: string,
  ids: string[],
) {
  for (let offset = 0; offset < ids.length; offset += DATABASE_BATCH_SIZE) {
    const { error } = await serviceRole
      .from(table)
      .delete()
      .in(column, ids.slice(offset, offset + DATABASE_BATCH_SIZE));

    if (error) {
      throw new Error(`Could not delete user data from ${table}: ${error.message}`);
    }
  }
}

async function deleteForumData(
  serviceRole: SupabaseClient,
  userId: string,
) {
  const [topicIds, replyIds] = await Promise.all([
    getOwnedRowIds(serviceRole, "forum_topics", "author_id", userId),
    getOwnedRowIds(serviceRole, "forum_replies", "author_id", userId),
  ]);

  await deleteRows(serviceRole, "forum_reply_notifications", "recipient_id", userId);
  await deleteRowsByIds(
    serviceRole,
    "forum_reply_notifications",
    "reply_id",
    replyIds,
  );

  for (const topicId of topicIds) {
    await deleteRows(
      serviceRole,
      "forum_reply_notifications",
      "topic_id",
      topicId,
    );
    await deleteRows(serviceRole, "forum_replies", "topic_id", topicId);
    await deleteRows(serviceRole, "forum_topics", "id", topicId);
  }

  await deleteRows(serviceRole, "forum_replies", "author_id", userId);
}

export async function deleteUserData(
  serviceRole: SupabaseClient,
  userId: string,
) {
  const [avatarPath, batchIds, noteImagePaths] = await Promise.all([
    getUserAvatarPath(serviceRole, userId),
    getOwnedBatchIds(serviceRole, userId),
    getUserNoteImagePaths(serviceRole, userId),
  ]);

  const avatarPaths = new Set<string>();
  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await serviceRole.storage
      .from("avatars")
      .list("", { search: userId, limit: STORAGE_PAGE_SIZE, offset });
    if (error) {
      throw new Error(`Could not list avatar storage: ${error.message}`);
    }

    const entries = data ?? [];
    for (const file of entries) {
      if (file.id !== null && file.name.startsWith(`${userId}-`)) {
        avatarPaths.add(file.name);
      }
    }
    if (entries.length < STORAGE_PAGE_SIZE) break;
  }
  if (avatarPath) avatarPaths.add(avatarPath);
  await removeStorageFiles(serviceRole, "avatars", [...avatarPaths]);

  const batchImagePaths = new Set(noteImagePaths);
  for (const batchId of batchIds) {
    for (const path of await listStorageFiles(serviceRole, "batch-images", batchId)) {
      batchImagePaths.add(path);
    }
  }
  await removeStorageFiles(serviceRole, "batch-images", [...batchImagePaths]);

  await deleteRows(serviceRole, "batch_notes", "user_id", userId);
  await deleteRows(serviceRole, "inventory_items", "user_id", userId);

  for (const batchId of batchIds) {
    const { error } = await serviceRole
      .from("sg_readings")
      .delete()
      .eq("batch_id", batchId);
    if (error) {
      throw new Error(`Could not delete readings for batch ${batchId}: ${error.message}`);
    }
  }

  await deleteRows(serviceRole, "batches", "user_id", userId);
  await deleteRows(serviceRole, "kar", "user_id", userId);
  await deleteRows(serviceRole, "recipes", "user_id", userId);
  await deleteForumData(serviceRole, userId);
  await deleteRows(serviceRole, "profiles", "id", userId);
}
