import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const PRODUCT_IMAGE_BUCKET = "business-product-images";
export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PRODUCT_IMAGE_PIXELS = 40_000_000;
const MAX_PROCESSED_IMAGE_DIMENSION = 2048;

const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export class ProductImageProcessingError extends Error {}

export function removeWhiteBackground(data: Uint8Array, width: number, height: number) {
  const pixelCount = width * height;
  const background = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let queueEnd = 0;

  function enqueueIfBackground(index: number) {
    if (background[index]) return;
    const offset = index * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const lightest = Math.max(red, green, blue);
    const darkest = Math.min(red, green, blue);
    if (
      data[offset + 3] !== 0 &&
      (darkest < 200 || lightest - darkest > 40)
    ) return;

    background[index] = 1;
    queue[queueEnd] = index;
    queueEnd += 1;
  }

  for (let x = 0; x < width; x += 1) {
    enqueueIfBackground(x);
    enqueueIfBackground((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueueIfBackground(y * width);
    enqueueIfBackground(y * width + width - 1);
  }

  for (let queueStart = 0; queueStart < queueEnd; queueStart += 1) {
    const index = queue[queueStart];
    const x = index % width;
    if (x > 0) enqueueIfBackground(index - 1);
    if (x < width - 1) enqueueIfBackground(index + 1);
    if (index >= width) enqueueIfBackground(index - width);
    if (index + width < pixelCount) enqueueIfBackground(index + width);

    const offset = index * 4;
    const alpha = data[offset + 3];
    const whiteness = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    const remainingOpacity = alpha === 0
      ? 0
      : Math.max(0, Math.min(1, (220 - whiteness) / 40));
    data[offset + 3] = Math.round(alpha * remainingOpacity);
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (background[index]) continue;
      const offset = index * 4;
      if (data[offset + 3] === 0) continue;

      let touchesBackground = false;
      for (let neighborY = Math.max(0, y - 1); neighborY <= Math.min(height - 1, y + 1); neighborY += 1) {
        for (let neighborX = Math.max(0, x - 1); neighborX <= Math.min(width - 1, x + 1); neighborX += 1) {
          if (background[neighborY * width + neighborX]) {
            touchesBackground = true;
            break;
          }
        }
        if (touchesBackground) break;
      }
      if (!touchesBackground) continue;

      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const lightest = Math.max(red, green, blue);
      const darkest = Math.min(red, green, blue);
      if (darkest < 190 || lightest - darkest > 50) continue;

      const remainingOpacity = Math.max(0, Math.min(1, (220 - darkest) / 40));
      data[offset + 3] = Math.round(data[offset + 3] * remainingOpacity);
    }
  }
  return data;
}

export async function processProductImage(file: File) {
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: MAX_PRODUCT_IMAGE_PIXELS });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Image dimensions are unavailable.");
    }
    if (metadata.width * metadata.height > MAX_PRODUCT_IMAGE_PIXELS) {
      throw new Error("Image dimensions are too large.");
    }

    const { data, info } = await image
      .rotate()
      .resize({
        width: MAX_PROCESSED_IMAGE_DIMENSION,
        height: MAX_PROCESSED_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    removeWhiteBackground(data, info.width, info.height);

    const processed = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .webp({ quality: 86, alphaQuality: 100 })
      .toBuffer();
    return new File([processed], "product.webp", { type: "image/webp" });
  } catch (error) {
    if (error instanceof ProductImageProcessingError) throw error;
    throw new ProductImageProcessingError(
      "Could not process this image. Try another JPEG, PNG, or WebP file."
    );
  }
}

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
  if (!IMAGE_TYPES.has(file.type)) throw new Error("Unsupported product image format.");
  const processedFile = await processProductImage(file);

  await ensureProductImageBucket(serviceRole);
  const path = `${businessId}/${crypto.randomUUID()}.webp`;
  const { error } = await serviceRole.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, processedFile, {
      cacheControl: "31536000",
      contentType: processedFile.type,
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
