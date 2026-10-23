import { NextRequest, NextResponse } from "next/server";
import {
  getBreweryContext,
  hasBreweryAccess,
  normalizeOptionalUrl,
  canEditBreweryPage,
  canManageBreweryProducts,
} from "@/lib/brewery/access";
import { isBusinessType } from "@/lib/brewery/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { account, serviceRole, isOwner, role, businesses } = await getBreweryContext();
    if (!account) return NextResponse.json({ account: null, businesses });

    const hasAccess = hasBreweryAccess(account);
    let productsWithAnalytics: Record<string, unknown>[] = [];
    if (hasAccess && canManageBreweryProducts(role)) {
      const [{ data: products, error: productsError }, { data: analytics, error: analyticsError }] =
        await Promise.all([
          serviceRole
            .from("brewery_products")
            .select("id, brewery_id, slug, name, category, description, product_url, image_url, style, abv, batch_size_l, ebc, ibu, package_size, availability, details, is_published, created_at")
            .eq("brewery_id", account.id)
            .order("created_at", { ascending: false }),
          serviceRole
            .from("brewery_product_analytics")
            .select("product_id, event_type, created_at")
            .eq("brewery_id", account.id)
            .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        ]);
      if (productsError) throw productsError;
      if (analyticsError) throw analyticsError;

      const stats = new Map<string, { pageViews: number; qrScans: number }>();
      for (const event of analytics ?? []) {
        const count = stats.get(event.product_id) ?? { pageViews: 0, qrScans: 0 };
        if (event.event_type === "qr_scan") count.qrScans += 1;
        else count.pageViews += 1;
        stats.set(event.product_id, count);
      }
      productsWithAnalytics = (products ?? []).map((product) => ({
        ...product,
        analytics: stats.get(product.id) ?? { pageViews: 0, qrScans: 0 },
      }));
    }

    return NextResponse.json(
      {
        account: isOwner
          ? { ...account, hasAccess, isOwner, role }
          : {
              id: account.id,
              name: account.name,
              business_type: account.business_type,
              business_type_other: account.business_type_other,
              slug: account.slug,
              description: account.description,
              location: account.location,
              website_url: account.website_url,
              logo_url: account.logo_url,
              status: account.status,
              manual_access_granted_at: account.manual_access_granted_at,
              manual_access_expires_at: account.manual_access_expires_at,
              stripe_subscription_status: null,
              stripe_customer_id: null,
              hasAccess,
              isOwner,
              role,
            },
        businesses,
        products: productsWithAnalytics,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Could not load brewery management data", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    return NextResponse.json(
      { error: unauthorized ? error.message : "Could not load brewery management data." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const websiteUrl = normalizeOptionalUrl(body.websiteUrl);
  const logoUrl = normalizeOptionalUrl(body.logoUrl);
  const businessType = body.businessType;
  const businessTypeOther =
    typeof body.businessTypeOther === "string" ? body.businessTypeOther.trim() : "";
  if (
    name.length < 2 ||
    name.length > 120 ||
    description.length > 5000 ||
    location.length > 200 ||
    websiteUrl === undefined ||
    logoUrl === undefined ||
    !isBusinessType(businessType) ||
    (businessType === "other" && (businessTypeOther.length < 2 || businessTypeOther.length > 100))
  ) {
    return NextResponse.json({ error: "Check your business details and try again." }, { status: 400 });
  }

  try {
    const { serviceRole, account, role } = await getBreweryContext();
    if (!account) return NextResponse.json({ error: "Brewery account not found." }, { status: 404 });
    if (!canEditBreweryPage(role)) {
      return NextResponse.json({ error: "Only business owners and managers can edit page details." }, { status: 403 });
    }
    if (!hasBreweryAccess(account)) {
      return NextResponse.json({ error: "An active business account is required to edit this page." }, { status: 403 });
    }

    const { error } = await serviceRole
      .from("brewery_accounts")
      .update({
        name,
        business_type: businessType,
        business_type_other: businessType === "other" ? businessTypeOther : null,
        description,
        location,
        website_url: websiteUrl,
        logo_url: logoUrl,
      })
      .eq("id", account.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not update business page", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    return NextResponse.json(
      { error: unauthorized ? error.message : "Could not update business page." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
