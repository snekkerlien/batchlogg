import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import {
  MAX_FORUM_IMAGE_SIZE,
  MAX_FORUM_IMAGES,
} from "@/lib/community/forumContent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "forum-images";
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

async function getAuthenticatedUser() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, serviceRole, error };
}

async function ensureBucket(serviceRole: ReturnType<typeof supabaseServer>["serviceRole"]) {
  const options = {
    public: true,
    fileSizeLimit: MAX_FORUM_IMAGE_SIZE,
    allowedMimeTypes: [...IMAGE_TYPES.keys()],
  };
  const { error } = await serviceRole.storage.createBucket(BUCKET, options);
  if (!error) return;

  const { data: buckets, error: listError } = await serviceRole.storage.listBuckets();
  if (listError || !buckets?.some((bucket) => bucket.name === BUCKET)) {
    console.error("Could not create forum image storage bucket", error, listError);
    throw new Error("Forum image storage is unavailable");
  }

  const { error: updateError } = await serviceRole.storage.updateBucket(BUCKET, options);
  if (updateError) {
    console.error("Could not configure forum image storage bucket", updateError);
    throw new Error("Forum image storage is unavailable");
  }
}

export async function POST(request: NextRequest) {
  const { user, serviceRole, error: authError } = await getAuthenticatedUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid image upload" }, { status: 400 });
  }

  const entries = formData.getAll("images");
  if (
    entries.length === 0 ||
    entries.length > MAX_FORUM_IMAGES ||
    entries.some((entry) => !(entry instanceof File))
  ) {
    return NextResponse.json(
      { error: `Choose between 1 and ${MAX_FORUM_IMAGES} images` },
      { status: 400 }
    );
  }
  const files = entries as File[];
  for (const file of files) {
    if (!IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Images must be JPEG, PNG, or WebP files" },
        { status: 400 }
      );
    }
    if (file.size === 0 || file.size > MAX_FORUM_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Each image must be smaller than 5 MB" },
        { status: 400 }
      );
    }
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const validSignature =
      file.type === "image/jpeg"
        ? header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
        : file.type === "image/png"
          ? header[0] === 0x89 &&
            header[1] === 0x50 &&
            header[2] === 0x4e &&
            header[3] === 0x47 &&
            header[4] === 0x0d &&
            header[5] === 0x0a &&
            header[6] === 0x1a &&
            header[7] === 0x0a
          : header[0] === 0x52 &&
            header[1] === 0x49 &&
            header[2] === 0x46 &&
            header[3] === 0x46 &&
            header[8] === 0x57 &&
            header[9] === 0x45 &&
            header[10] === 0x42 &&
            header[11] === 0x50;
    if (!validSignature) {
      return NextResponse.json(
        { error: "The selected file is not a valid JPEG, PNG, or WebP image" },
        { status: 400 }
      );
    }
  }

  const uploadedPaths: string[] = [];
  try {
    await ensureBucket(serviceRole);
    const images = [];
    for (const file of files) {
      const extension = IMAGE_TYPES.get(file.type);
      if (!extension) throw new Error("Unsupported image format");

      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await serviceRole.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      uploadedPaths.push(path);
      images.push({
        path,
        url: serviceRole.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
      });
    }
    return NextResponse.json({ images });
  } catch (uploadError) {
    console.error("Could not upload forum images", uploadError);
    if (uploadedPaths.length) {
      const { error: cleanupError } = await serviceRole.storage
        .from(BUCKET)
        .remove(uploadedPaths);
      if (cleanupError) {
        console.error("Could not clean up incomplete forum image upload", cleanupError);
      }
    }
    return NextResponse.json({ error: "Could not upload images" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { user, serviceRole, error: authError } = await getAuthenticatedUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { paths?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid image cleanup request" }, { status: 400 });
  }

  if (
    !Array.isArray(body.paths) ||
    body.paths.length > MAX_FORUM_IMAGES ||
    body.paths.some(
      (path) =>
        typeof path !== "string" ||
        !path.startsWith(`${user.id}/`) ||
        path.split("/").length !== 2
    )
  ) {
    return NextResponse.json({ error: "Invalid image cleanup request" }, { status: 400 });
  }
  if (body.paths.length === 0) return NextResponse.json({ success: true });

  const { error: removeError } = await serviceRole.storage
    .from(BUCKET)
    .remove(body.paths as string[]);
  if (removeError) {
    console.error("Could not clean up forum images", removeError);
    return NextResponse.json({ error: "Could not clean up uploaded images" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
