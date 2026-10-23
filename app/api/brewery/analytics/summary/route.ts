import { NextRequest, NextResponse } from "next/server";
import { getBreweryContext, hasBreweryAccess, canViewBreweryAnalytics } from "@/lib/brewery/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERIOD_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export async function GET(request: NextRequest) {
  try {
    const { account, serviceRole, role } = await getBreweryContext();
    if (!account) return NextResponse.json({ error: "Business account not found." }, { status: 404 });
    if (!hasBreweryAccess(account)) {
      return NextResponse.json({ error: "An active business account is required." }, { status: 403 });
    }
    if (!canViewBreweryAnalytics(role)) {
      return NextResponse.json({ error: "Only owners, managers, and editors can view analytics." }, { status: 403 });
    }

    const period = request.nextUrl.searchParams.get("period") ?? "30d";
    const periodDays = PERIOD_DAYS[period];
    if (!periodDays) return NextResponse.json({ error: "Choose a valid analytics period." }, { status: 400 });
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: products, error: productsError } = await serviceRole
      .from("brewery_products")
      .select("id, slug, name, category, is_published")
      .eq("brewery_id", account.id);
    if (productsError) throw productsError;
    const productIds = (products ?? []).map((product) => product.id);
    const [{ data: events, error: eventsError }, reviewResult] = await Promise.all([
      serviceRole
        .from("brewery_product_analytics")
        .select("product_id, event_type, created_at")
        .eq("brewery_id", account.id)
        .gte("created_at", startDate),
      productIds.length
        ? serviceRole
            .from("brewery_product_reviews")
            .select("product_id, rating, title, body, created_at")
            .in("product_id", productIds)
            .eq("status", "published")
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (eventsError) throw eventsError;
    const { data: reviews, error: reviewsError } = reviewResult;
    if (reviewsError) throw reviewsError;

    const productStats = new Map<string, {
      pageViews: number;
      qrScans: number;
      ratingsTotal: number;
      reviewCount: number;
      newReviews: number;
    }>();
    for (const product of products ?? []) {
      productStats.set(product.id, {
        pageViews: 0,
        qrScans: 0,
        ratingsTotal: 0,
        reviewCount: 0,
        newReviews: 0,
      });
    }

    const dailyStats = new Map<string, { pageViews: number; qrScans: number }>();
    for (let offset = periodDays - 1; offset >= 0; offset -= 1) {
      const day = new Date(Date.now() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      dailyStats.set(day, { pageViews: 0, qrScans: 0 });
    }

    let pageViews = 0;
    let qrScans = 0;
    for (const event of events ?? []) {
      const stats = productStats.get(event.product_id);
      const dayStats = dailyStats.get(event.created_at.slice(0, 10));
      if (!stats || !dayStats) continue;
      if (event.event_type === "qr_scan") {
        stats.qrScans += 1;
        dayStats.qrScans += 1;
        qrScans += 1;
      } else {
        stats.pageViews += 1;
        dayStats.pageViews += 1;
        pageViews += 1;
      }
    }

    let ratingsTotal = 0;
    let reviewCount = 0;
    let newReviews = 0;
    const ratingDistribution = [0, 0, 0, 0, 0];
    const productNames = new Map((products ?? []).map((product) => [product.id, product.name]));
    const recentReviews: {
      productId: string;
      productName: string;
      rating: number;
      title: string;
      body: string;
      createdAt: string;
    }[] = [];
    for (const review of reviews ?? []) {
      const stats = productStats.get(review.product_id);
      if (!stats) continue;
      stats.ratingsTotal += review.rating;
      stats.reviewCount += 1;
      ratingsTotal += review.rating;
      reviewCount += 1;
      ratingDistribution[review.rating - 1] += 1;
      recentReviews.push({
        productId: review.product_id,
        productName: productNames.get(review.product_id) ?? "Product",
        rating: review.rating,
        title: review.title,
        body: review.body,
        createdAt: review.created_at,
      });
      if (review.created_at >= startDate) {
        stats.newReviews += 1;
        newReviews += 1;
      }
    }

    const productSummaries = (products ?? [])
      .map((product) => {
        const stats = productStats.get(product.id)!;
        return {
          ...product,
          pageViews: stats.pageViews,
          qrScans: stats.qrScans,
          averageRating: stats.reviewCount ? stats.ratingsTotal / stats.reviewCount : null,
          reviewCount: stats.reviewCount,
          newReviews: stats.newReviews,
        };
      })
      .sort((left, right) =>
        right.pageViews + right.qrScans - (left.pageViews + left.qrScans) ||
        right.reviewCount - left.reviewCount ||
        left.name.localeCompare(right.name)
      );

    return NextResponse.json(
      {
        period,
        periodDays,
        summary: {
          pageViews,
          qrScans,
          averageRating: reviewCount ? ratingsTotal / reviewCount : null,
          reviewCount,
          newReviews,
          publishedProducts: (products ?? []).filter((product) => product.is_published).length,
        },
        ratingDistribution: ratingDistribution.map((count, index) => ({
          rating: index + 1,
          count,
        })),
        recentReviews: recentReviews
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
          .slice(0, 5),
        daily: Array.from(dailyStats, ([date, stats]) => ({ date, ...stats })),
        products: productSummaries,
        businessSlug: account.slug,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Could not load business analytics", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    return NextResponse.json(
      { error: unauthorized ? error.message : "Could not load business analytics." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
