import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
  }

  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { data: recipe, error: recipeError } = await serviceRole
    .from("recipes")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (recipeError) {
    console.error("Could not verify recipe for batch results", recipeError);
    return NextResponse.json(
      { error: "Could not load recipe batch results" },
      { status: 500 }
    );
  }
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const { data: batches, error: batchesError } = await serviceRole
    .from("batches")
    .select(
      "id, name, status, finished_date, startdato, og, fg, abv, volume_l, packaged_volume_l, recipe_snapshot"
    )
    .eq("recipe_id", params.id)
    .eq("user_id", user.id)
    .order("finished_date", { ascending: false })
    .limit(50);
  if (batchesError) {
    console.error("Could not load recipe batch results", batchesError);
    if (["42703", "PGRST204"].includes(batchesError.code ?? "")) {
      return NextResponse.json(
        { error: "Apply the batch lifecycle migration to view recipe results." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not load recipe batch results" },
      { status: 500 }
    );
  }

  const finishedStatuses = new Set(["finished", "avsluttet", "ferdig"]);
  const finishedBatches = (batches ?? []).filter(
    (batch) =>
      Boolean(batch.finished_date) &&
      finishedStatuses.has(String(batch.status ?? "").toLowerCase())
  );

  return NextResponse.json({ batches: finishedBatches });
}
