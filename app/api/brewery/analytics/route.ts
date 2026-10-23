import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { hasBreweryAccess } from "@/lib/brewery/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let body: { productId?: unknown; source?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (
    typeof body.productId !== "string" ||
    !UUID_PATTERN.test(body.productId) ||
    (body.source !== "page" && body.source !== "qr")
  ) return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });

  const { serviceRole } = supabaseServer();
  const { data: product, error: productError } = await serviceRole
    .from("brewery_products")
    .select("id, brewery_id")
    .eq("id", body.productId)
    .eq("is_published", true)
    .maybeSingle();
  if (productError) {
    console.error("Could not verify brewery product analytics event", productError);
    return NextResponse.json({ error: "Could not record product visit." }, { status: 500 });
  }
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const { data: account, error: accountError } = await serviceRole
    .from("brewery_accounts")
    .select("*")
    .eq("id", product.brewery_id)
    .maybeSingle();
  if (accountError) {
    console.error("Could not verify brewery analytics access", accountError);
    return NextResponse.json({ error: "Could not record product visit." }, { status: 500 });
  }
  if (!account || !hasBreweryAccess(account)) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const { error } = await serviceRole.from("brewery_product_analytics").insert({
    brewery_id: account.id,
    product_id: product.id,
    event_type: body.source === "qr" ? "qr_scan" : "page_view",
  });
  if (error) {
    console.error("Could not record brewery product visit", error);
    return NextResponse.json({ error: "Could not record product visit." }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}
