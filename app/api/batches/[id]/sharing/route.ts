import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
  }

  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("shareOutcomePublicly" in body) ||
    typeof body.shareOutcomePublicly !== "boolean" ||
    !("shareTastingNotesPublicly" in body) ||
    typeof body.shareTastingNotesPublicly !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid sharing settings" }, { status: 400 });
  }

  const shareOutcomePublicly = body.shareOutcomePublicly;
  const shareTastingNotesPublicly = body.shareTastingNotesPublicly;
  if (shareTastingNotesPublicly && !shareOutcomePublicly) {
    return NextResponse.json(
      { error: "Tasting notes can only be shared with a batch outcome." },
      { status: 400 }
    );
  }

  const { data: batch, error: batchError } = await serviceRole
    .from("batches")
    .select("id, user_id, recipe_id, status, finished_date, share_outcome_publicly")
    .eq("id", params.id)
    .maybeSingle();
  if (batchError) {
    console.error("Could not load batch sharing settings", batchError);
    if (["42703", "PGRST204"].includes(batchError.code ?? "")) {
      return NextResponse.json(
        { error: "Apply the batch lifecycle database migration before sharing results." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Could not update outcome sharing" }, { status: 500 });
  }
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }
  if (batch.user_id !== user.id) {
    return NextResponse.json({ error: "Only the brewer can change sharing settings" }, { status: 403 });
  }

  if (shareOutcomePublicly && !batch.share_outcome_publicly) {
    if (
      !batch.finished_date ||
      !["finished", "avsluttet", "ferdig"].includes(
        String(batch.status ?? "").toLowerCase()
      )
    ) {
      return NextResponse.json(
        { error: "Only finished batches can be shared." },
        { status: 409 }
      );
    }
    if (!batch.recipe_id) {
      return NextResponse.json(
        { error: "Link this batch to a recipe before sharing its outcome." },
        { status: 400 }
      );
    }
    const [
      { data: recipe, error: recipeError },
      { data: profile, error: profileError },
    ] = await Promise.all([
      serviceRole
        .from("recipes")
        .select("id")
        .eq("id", batch.recipe_id)
        .eq("user_id", user.id)
        .eq("is_public", true)
        .maybeSingle(),
      serviceRole
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .eq("is_public", true)
        .maybeSingle(),
    ]);
    if (recipeError || profileError) {
      console.error("Could not verify public outcome eligibility", recipeError || profileError);
      return NextResponse.json({ error: "Could not verify sharing eligibility" }, { status: 500 });
    }
    if (!recipe || !profile) {
      return NextResponse.json(
        { error: "Make both your source recipe and profile public before sharing this outcome." },
        { status: 409 }
      );
    }
  }

  const { data: updatedBatch, error: updateError } = await serviceRole
    .from("batches")
    .update({
      share_outcome_publicly: shareOutcomePublicly,
      share_tasting_notes_publicly: shareTastingNotesPublicly,
    })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (updateError) {
    console.error("Could not save batch outcome sharing", updateError);
    return NextResponse.json({ error: "Could not save outcome sharing" }, { status: 500 });
  }
  if (!updatedBatch) {
    return NextResponse.json({ error: "Batch not found or access denied" }, { status: 404 });
  }

  return NextResponse.json({
    shareOutcomePublicly,
    shareTastingNotesPublicly,
  });
}
