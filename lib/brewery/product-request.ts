import type { NextRequest } from "next/server";
import { MAX_PRODUCT_IMAGE_SIZE } from "@/lib/brewery/product-images";

const MAX_REQUEST_SIZE = MAX_PRODUCT_IMAGE_SIZE + 64 * 1024;

export async function readProductRequest(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
    return { error: "Product image must be 5 MB or smaller." } as const;
  }

  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return { error: "Invalid product form data." } as const;
    }
    const productValue = formData.get("product");
    const imageEntries = formData.getAll("image");
    if (
      typeof productValue !== "string" ||
      imageEntries.length > 1 ||
      imageEntries.some((entry) => !(entry instanceof File))
    ) return { error: "Invalid product form data." } as const;

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(productValue);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return { error: "Invalid product details." } as const;
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return { error: "Invalid product details." } as const;
    }

    const image = imageEntries[0] instanceof File && imageEntries[0].size > 0
      ? imageEntries[0]
      : null;
    return {
      body,
      image,
      removeImage: formData.get("removeImage") === "true",
    } as const;
  }

  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { error: "Invalid product details." } as const;
    }
    return {
      body: parsed as Record<string, unknown>,
      image: null,
      removeImage: false,
    } as const;
  } catch {
    return { error: "Invalid request body." } as const;
  }
}
