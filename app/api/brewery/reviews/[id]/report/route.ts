import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: "Invalid review ID." }, { status: 400 });
  let body: { reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason || reason.length > 1000) return NextResponse.json({ error: "Provide a short reason for the report." }, { status: 400 });

  const { supabase, serviceRole } = supabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Log in to report a review." }, { status: 401 });
  const { data: review, error: reviewError } = await serviceRole
    .from("brewery_product_reviews")
    .select("id")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();
  if (reviewError) {
    console.error("Could not verify reported brewery review", reviewError);
    return NextResponse.json({ error: "Could not verify review." }, { status: 500 });
  }
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  const { error } = await serviceRole.from("brewery_review_reports").upsert(
    { review_id: review.id, reporter_id: user.id, reason, status: "open" },
    { onConflict: "review_id,reporter_id" }
  );
  if (error) {
    console.error("Could not report brewery review", error);
    return NextResponse.json({ error: "Could not report review." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
