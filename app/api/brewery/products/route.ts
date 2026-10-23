import { NextRequest, NextResponse } from "next/server";
import {
  getBreweryContext,
  hasBreweryAccess,
  canManageBreweryProducts,
} from "@/lib/brewery/access";
import { validateBreweryProduct } from "@/lib/brewery/products";
import { readProductRequest } from "@/lib/brewery/product-request";
import { uploadProductImage, validateProductImage } from "@/lib/brewery/product-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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
  try {
    const context = await getBreweryContext();
    const { account, role } = context;
    serviceRole = context.serviceRole;
    if (!account) return NextResponse.json({ error: "Brewery account not found." }, { status: 404 });
    if (!hasBreweryAccess(account)) return NextResponse.json({ error: "An active business account is required." }, { status: 403 });
    if (!canManageBreweryProducts(role)) return NextResponse.json({ error: "Only owners, managers, and editors can manage products." }, { status: 403 });

    if (image) {
      const uploadedImage = await uploadProductImage(serviceRole, account.id, image);
      uploadedPath = uploadedImage.path;
      product.image_url = uploadedImage.url;
    }

    const { data, error } = await serviceRole
      .from("brewery_products")
      .insert({ ...product, brewery_id: account.id })
      .select("id, slug, name, category, description, product_url, image_url, style, abv, batch_size_l, ebc, ibu, package_size, availability, details, is_published")
      .single();
    if (error?.code === "23505") {
      if (uploadedPath) {
        const { error: cleanupError } = await serviceRole.storage
          .from("business-product-images")
          .remove([uploadedPath]);
        if (cleanupError) console.error("Could not clean up duplicate product image", cleanupError);
      }
      return NextResponse.json({ error: "A product with that name or URL already exists for your brewery." }, { status: 409 });
    }
    if (error) throw error;
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    if (uploadedPath && serviceRole) {
      const { error: cleanupError } = await serviceRole.storage
        .from("business-product-images")
        .remove([uploadedPath]);
      if (cleanupError) console.error("Could not clean up incomplete product image upload", cleanupError);
    }
    console.error("Could not add brewery product", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    return NextResponse.json(
      { error: unauthorized ? error.message : "Could not add product." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
