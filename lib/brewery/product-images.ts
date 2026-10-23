import type { SupabaseClient } from "@supabase/supabase-js";

export const PRODUCT_IMAGE_BUCKET = "business-product-images";
export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;

const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function validateProductImage(file: File | null) {
  if (!file) return null;
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (!file.size || file.size > MAX_PRODUCT_IMAGE_SIZE) {
    throw new Error("Product images must be 5 MB or smaller.");
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

  if (!validSignature) throw new Error("The selected file is not a valid image.");
  return file;
}

async function ensureProductImageBucket(serviceRole: SupabaseClient) {
  const options = {
    public: true,
    fileSizeLimit: MAX_PRODUCT_IMAGE_SIZE,
    allowedMimeTypes: [...IMAGE_TYPES.keys()],
  };
  const { error } = await serviceRole.storage.createBucket(PRODUCT_IMAGE_BUCKET, options);
  if (!error) return;

  const { data: buckets, error: listError } = await serviceRole.storage.listBuckets();
  if (listError || !buckets?.some((bucket) => bucket.name === PRODUCT_IMAGE_BUCKET)) {
    console.error("Could not create business product image bucket", error, listError);
    throw new Error("Product image storage is unavailable.");
  }
  const { error: updateError } = await serviceRole.storage.updateBucket(PRODUCT_IMAGE_BUCKET, options);
  if (updateError) {
    console.error("Could not configure business product image bucket", updateError);
    throw new Error("Product image storage is unavailable.");
  }
}

export async function uploadProductImage(
  serviceRole: SupabaseClient,
  businessId: string,
  file: File
) {
  const extension = IMAGE_TYPES.get(file.type);
  if (!extension) throw new Error("Unsupported product image format.");

  await ensureProductImageBucket(serviceRole);
  const path = `${businessId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await serviceRole.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
  if (error) throw error;
  return {
    path,
    url: serviceRole.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl,
  };
}

export function getOwnedProductImagePath(imageUrl: string | null, businessId: string) {
  if (!imageUrl) return null;
  try {
    const pathname = new URL(imageUrl).pathname;
    const prefix = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
    if (!pathname.startsWith(prefix)) return null;
    const relativePath = pathname.slice(prefix.length);
    const segments = relativePath.split("/");
    if (
      segments.length !== 2 ||
      segments[0] !== businessId ||
      !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(segments[1])
    ) return null;
    return relativePath;
  } catch {
    return null;
  }
}

export async function removeOwnedProductImage(
  serviceRole: SupabaseClient,
  imageUrl: string | null,
  businessId: string
) {
  const path = getOwnedProductImagePath(imageUrl, businessId);
  if (!path) return;
  const { error } = await serviceRole.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  if (error) throw error;
}
