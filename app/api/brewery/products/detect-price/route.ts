import { NextRequest, NextResponse } from "next/server";
import {
  canManageBreweryProducts,
  getBreweryContext,
  hasBreweryAccess,
} from "@/lib/brewery/access";
import { detectProductPrice } from "@/lib/brewery/detect-product-price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 8 * 1024) {
    return NextResponse.json({ error: "Product page URL is too long." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const productUrl = (body as Record<string, unknown>).productUrl;

  let context: Awaited<ReturnType<typeof getBreweryContext>>;
  try {
    context = await getBreweryContext();
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Could not verify access for product price suggestion", error);
    return NextResponse.json({ error: "Could not verify business access." }, { status: 500 });
  }
  const { account, role } = context;
  if (!account) {
    return NextResponse.json({ error: "Brewery account not found." }, { status: 404 });
  }
  if (!hasBreweryAccess(account)) {
    return NextResponse.json({ error: "An active business account is required." }, { status: 403 });
  }
  if (!canManageBreweryProducts(role)) {
    return NextResponse.json(
      { error: "Only owners, managers, and editors can manage products." },
      { status: 403 }
    );
  }

  try {
    const price = await detectProductPrice(productUrl);
    return NextResponse.json({ price }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not suggest a price from that product page.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
