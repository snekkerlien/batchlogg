import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getPublishedReview(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  reviewId: string
) {
  const { data, error } = await serviceRole
    .from("brewery_product_reviews")
    .select("id, user_id")
    .eq("id", reviewId)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getAuthenticatedUser(request: NextRequest) {
  const { supabase } = supabaseServer();
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return { response: NextResponse.json({ error: "Invalid request origin." }, { status: 403 }) };
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { response: NextResponse.json({ error: "Log in to vote on a review." }, { status: 401 }) };
  }
  return { user };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid review ID." }, { status: 400 });
  }
  const auth = await getAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  const { serviceRole } = supabaseServer();
  try {
    const review = await getPublishedReview(serviceRole, params.id);
    if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
    if (review.user_id === auth.user.id) {
      return NextResponse.json({ error: "You cannot vote on your own review." }, { status: 403 });
    }

    const { error } = await serviceRole
      .from("brewery_review_helpful_votes")
      .upsert(
        { review_id: review.id, user_id: auth.user.id },
        { onConflict: "review_id,user_id", ignoreDuplicates: true }
      );
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not mark brewery review helpful", error);
    return NextResponse.json({ error: "Could not save your vote." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid review ID." }, { status: 400 });
  }
  const auth = await getAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  const { serviceRole } = supabaseServer();
  try {
    const review = await getPublishedReview(serviceRole, params.id);
    if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });

    const { data, error } = await serviceRole
      .from("brewery_review_helpful_votes")
      .delete()
      .eq("review_id", review.id)
      .eq("user_id", auth.user.id)
      .select("review_id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Your helpful vote was not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not remove brewery review helpful vote", error);
    return NextResponse.json({ error: "Could not remove your vote." }, { status: 500 });
  }
}
