import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { hasBreweryAccess } from "@/lib/brewery/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getPublicProduct(serviceRole: ReturnType<typeof supabaseServer>["serviceRole"], productId: string) {
  const { data: product, error } = await serviceRole
    .from("brewery_products")
    .select("id, brewery_id, is_published")
    .eq("id", productId)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  if (!product) return null;

  const { data: brewery, error: breweryError } = await serviceRole
    .from("brewery_accounts")
    .select("*")
    .eq("id", product.brewery_id)
    .maybeSingle();
  if (breweryError) throw breweryError;
  return brewery && hasBreweryAccess(brewery) ? product : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
  const { supabase, serviceRole } = supabaseServer();
  try {
    if (!(await getPublicProduct(serviceRole, params.id))) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError && authError.name !== "AuthSessionMissingError") {
      console.error("Could not verify reviewer session", authError);
    }
    const { data, error } = await serviceRole
      .from("brewery_product_reviews")
      .select("id, user_id, rating, title, body, created_at")
      .eq("product_id", params.id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const reviewIds = (data ?? []).map((review) => review.id);
    const { data: votes, error: votesError } = reviewIds.length
      ? await serviceRole
          .from("brewery_review_helpful_votes")
          .select("review_id,user_id")
          .in("review_id", reviewIds)
      : { data: [], error: null };
    const helpfulVotingUnavailable = Boolean(
      votesError && ["42P01", "PGRST205"].includes(votesError.code ?? "")
    );
    if (helpfulVotingUnavailable) {
      console.warn("Helpful votes are unavailable until their database migration is applied.");
    } else if (votesError) {
      throw votesError;
    }
    const voteSummary = new Map<string, { count: number; viewerVoted: boolean }>();
    for (const vote of votes ?? []) {
      const summary = voteSummary.get(vote.review_id) ?? { count: 0, viewerVoted: false };
      summary.count += 1;
      if (user?.id === vote.user_id) summary.viewerVoted = true;
      voteSummary.set(vote.review_id, summary);
    }
    const userIds = [...new Set((data ?? []).map((review) => review.user_id))];
    const { data: profiles, error: profilesError } = userIds.length
      ? await serviceRole.from("profiles").select("id, username").in("id", userIds)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const usernames = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
    const reviews = (data ?? []).map((review) => ({
      id: review.id,
      username: usernames.get(review.user_id) || "Community member",
      isOwn: Boolean(user && user.id === review.user_id),
      helpfulCount: voteSummary.get(review.id)?.count ?? 0,
      viewerVotedHelpful: voteSummary.get(review.id)?.viewerVoted ?? false,
      canVoteHelpful: !helpfulVotingUnavailable && Boolean(user && user.id !== review.user_id),
      rating: review.rating,
      title: review.title,
      body: review.body,
      created_at: review.created_at,
    }));
    const average =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : null;
    const ratingBreakdown = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: reviews.filter((review) => review.rating === rating).length,
    }));
    return NextResponse.json({
      reviews,
      average,
      count: reviews.length,
      ratingBreakdown,
      helpfulVotingUnavailable,
    });
  } catch (error) {
    console.error("Could not load brewery product reviews", error);
    return NextResponse.json({ error: "Could not load product reviews." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
  }

  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Log in to remove your review." }, { status: 401 });
  }

  try {
    if (!(await getPublicProduct(serviceRole, params.id))) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const { data, error } = await serviceRole
      .from("brewery_product_reviews")
      .delete()
      .eq("product_id", params.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Your review was not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not delete brewery product review", error);
    return NextResponse.json({ error: "Could not remove your review." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const rating = Number(body.rating);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const reviewBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || title.length > 120 || reviewBody.length < 1 || reviewBody.length > 3000) {
    return NextResponse.json({ error: "Provide a rating from 1 to 5 and a review of up to 3,000 characters." }, { status: 400 });
  }

  const { supabase, serviceRole } = supabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Log in to review this product." }, { status: 401 });
  try {
    if (!(await getPublicProduct(serviceRole, params.id))) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    const { data: existingReview, error: existingReviewError } = await serviceRole
      .from("brewery_product_reviews")
      .select("id, status")
      .eq("product_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingReviewError) throw existingReviewError;
    if (existingReview?.status === "hidden") {
      return NextResponse.json(
        { error: "This review was hidden by moderation. Contact support if you want it reviewed." },
        { status: 403 }
      );
    }
    const { data, error } = await serviceRole
      .from("brewery_product_reviews")
      .upsert(
        {
          product_id: params.id,
          user_id: user.id,
          rating,
          title,
          body: reviewBody,
          status: "published",
        },
        { onConflict: "product_id,user_id" }
      )
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, reviewId: data.id });
  } catch (error) {
    console.error("Could not save brewery product review", error);
    return NextResponse.json({ error: "Could not save your review." }, { status: 500 });
  }
}
