import { NextRequest, NextResponse } from "next/server";
import {
  getBreweryContext,
  hasBreweryAccess,
  canManageBreweryProducts,
} from "@/lib/brewery/access";
import {
  isBeerKitProductCategory,
  validateBreweryProduct,
} from "@/lib/brewery/products";
import { readProductRequest } from "@/lib/brewery/product-request";
import {
  ProductImageProcessingError,
  removeOwnedProductImage,
  uploadProductImage,
  validateProductImage,
} from "@/lib/brewery/product-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
  const requestData = await readProductRequest(request);
  if ("error" in requestData) {
    return NextResponse.json({ error: requestData.error }, { status: 400 });
  }
  const product = validateBreweryProduct(requestData.body);
  if (!product) return NextResponse.json({ error: "Check the product details and try again." }, { status: 400 });
  let image: File | null;
  try {
    image = await validateProductImage(requestData.image);
  } catch (validationError) {
    return NextResponse.json({
      error: validationError instanceof Error ? validationError.message : "Invalid product image.",
    }, { status: 400 });
  }

  let uploadedPath: string | null = null;
  let serviceRole: Awaited<ReturnType<typeof getBreweryContext>>["serviceRole"] | null = null;
  let currentImageUrl: string | null = null;
  try {
    const context = await getBreweryContext();
    const { account, role } = context;
    serviceRole = context.serviceRole;
    if (!account) return NextResponse.json({ error: "Brewery account not found." }, { status: 404 });
    if (!hasBreweryAccess(account)) return NextResponse.json({ error: "An active business account is required." }, { status: 403 });
    if (!canManageBreweryProducts(role)) return NextResponse.json({ error: "Only owners, managers, and editors can manage products." }, { status: 403 });
    if (account.business_type === "homebrew_shop" && !isBeerKitProductCategory(product.category)) {
      return NextResponse.json(
        { error: "Homebrew shops can only list beer kits." },
        { status: 400 }
      );
    }
    const { data: currentProduct, error: currentProductError } = await serviceRole
      .from("brewery_products")
      .select("image_url")
      .eq("id", params.id)
      .eq("brewery_id", account.id)
      .maybeSingle();
    if (currentProductError) throw currentProductError;
    if (!currentProduct) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    currentImageUrl = currentProduct.image_url;

    if (image) {
      const uploadedImage = await uploadProductImage(serviceRole, account.id, image);
      uploadedPath = uploadedImage.path;
      product.image_url = uploadedImage.url;
    } else if (requestData.removeImage) {
      product.image_url = null;
    } else {
      product.image_url = currentProduct.image_url;
    }
    const { data, error } = await serviceRole
      .from("brewery_products")
      .update(product)
      .eq("id", params.id)
      .eq("brewery_id", account.id)
      .select("id")
      .maybeSingle();
    if (error?.code === "23505") {
      if (uploadedPath) {
        const { error: cleanupError } = await serviceRole.storage
          .from("business-product-images")
          .remove([uploadedPath]);
        if (cleanupError) console.error("Could not clean up duplicate product image", cleanupError);
      }
      return NextResponse.json({ error: "A product with that URL already exists." }, { status: 409 });
    }
    if (error) throw error;
    if (!data) {
      if (uploadedPath) {
        const { error: cleanupError } = await serviceRole.storage
          .from("business-product-images")
          .remove([uploadedPath]);
        if (cleanupError) console.error("Could not clean up product image after missing product", cleanupError);
      }
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    if (product.image_url !== currentImageUrl) {
      try {
        await removeOwnedProductImage(serviceRole, currentImageUrl, account.id);
      } catch (cleanupError) {
        console.error("Could not clean up replaced product image", cleanupError);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (uploadedPath && serviceRole) {
      const { error: cleanupError } = await serviceRole.storage
        .from("business-product-images")
        .remove([uploadedPath]);
      if (cleanupError) console.error("Could not clean up incomplete product image upload", cleanupError);
    }
    console.error("Could not update brewery product", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    const imageProcessingError = error instanceof ProductImageProcessingError;
    return NextResponse.json(
      {
        error: unauthorized
          ? error.message
          : imageProcessingError
            ? error.message
            : "Could not update product.",
      },
      { status: unauthorized ? 401 : imageProcessingError ? 400 : 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
  try {
    const { account, serviceRole, role } = await getBreweryContext();
    if (!account) return NextResponse.json({ error: "Brewery account not found." }, { status: 404 });
    if (!hasBreweryAccess(account)) return NextResponse.json({ error: "An active business account is required." }, { status: 403 });
    if (!canManageBreweryProducts(role)) return NextResponse.json({ error: "Only owners, managers, and editors can manage products." }, { status: 403 });
    const { data: product, error: productError } = await serviceRole
      .from("brewery_products")
      .select("image_url")
      .eq("id", params.id)
      .eq("brewery_id", account.id)
      .maybeSingle();
    if (productError) throw productError;
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    const { data, error } = await serviceRole
      .from("brewery_products")
      .delete()
      .eq("id", params.id)
      .eq("brewery_id", account.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    try {
      await removeOwnedProductImage(serviceRole, product.image_url, account.id);
    } catch (cleanupError) {
      console.error("Could not clean up deleted product image", cleanupError);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not delete brewery product", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    return NextResponse.json({ error: unauthorized ? error.message : "Could not delete product." }, { status: unauthorized ? 401 : 500 });
  }
}
