import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SNAPSHOT_FIELDS = [
  "name",
  "type",
  "og",
  "fg",
  "abv",
  "volume",
  "malts",
  "hops",
  "dry_hops",
  "fruits",
  "ingredients",
  "steps",
  "yeast",
  "additives",
  "full_process",
  "notes",
  "secondary_additions",
  "secondary_notes",
  "juice_type",
  "sugar_amount",
  "honey_type",
  "honey_amount",
  "base_liquid",
  "base_liquid_amount",
  "boil_time",
  "boil_volume",
] as const;

function normalizeType(type: unknown) {
  return typeof type === "string" ? type.trim().toLocaleLowerCase() : "";
}

async function getOwnedFinishedBatch(
  batchId: string,
  userId: string,
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"]
) {
  const { data: batch, error } = await serviceRole
    .from("batches")
    .select("id, user_id, type, status, finished_date")
    .eq("id", batchId)
    .maybeSingle();

  if (error) {
    console.error("Could not load batch recipe-link settings", error);
    return {
      response: NextResponse.json(
        { error: "Could not load batch recipe-link settings" },
        { status: 500 }
      ),
      batch: null,
    };
  }
  if (!batch) {
    return {
      response: NextResponse.json({ error: "Batch not found" }, { status: 404 }),
      batch: null,
    };
  }
  if (batch.user_id !== userId) {
    return {
      response: NextResponse.json(
        { error: "Only the brewer can link a recipe to this batch" },
        { status: 403 }
      ),
      batch: null,
    };
  }
  if (
    !batch.finished_date ||
    !["finished", "avsluttet", "ferdig"].includes(
      String(batch.status ?? "").toLowerCase()
    )
  ) {
    return {
      response: NextResponse.json(
        { error: "Only finished batches can be linked for community sharing." },
        { status: 409 }
      ),
      batch: null,
    };
  }

  return { response: null, batch };
}

export async function GET(
  _request: Request,
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
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { response, batch } = await getOwnedFinishedBatch(
    params.id,
    user.id,
    serviceRole
  );
  if (response || !batch) return response;

  const { data: savedFromBatch, error: savedFromBatchError } = await serviceRole
    .from("recipes")
    .select("id, name, type")
    .eq("batch_id", batch.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (savedFromBatchError) {
    console.error("Could not find recipes saved from this batch", savedFromBatchError);
    return NextResponse.json(
      { error: "Could not check for a recipe saved from this batch" },
      { status: 500 }
    );
  }

  if (
    savedFromBatch &&
    normalizeType(savedFromBatch.type) === normalizeType(batch.type)
  ) {
    return NextResponse.json({ savedFromBatch });
  }

  const { data: recipes, error } = await serviceRole
    .from("recipes")
    .select("id, name, type")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Could not load recipes for batch linking", error);
    return NextResponse.json(
      { error: "Could not load recipes for this batch" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    recipes: (recipes ?? []).filter(
      (recipe) => normalizeType(recipe.type) === normalizeType(batch.type)
    ),
  });
}

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
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
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
    !("recipeId" in body) ||
    typeof body.recipeId !== "string" ||
    !UUID_PATTERN.test(body.recipeId)
  ) {
    return NextResponse.json({ error: "Select a valid recipe" }, { status: 400 });
  }

  const { response, batch } = await getOwnedFinishedBatch(
    params.id,
    user.id,
    serviceRole
  );
  if (response || !batch) return response;

  const { data: recipe, error: recipeError } = await serviceRole
    .from("recipes")
    .select("*")
    .eq("id", body.recipeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (recipeError) {
    console.error("Could not verify recipe for batch linking", recipeError);
    return NextResponse.json(
      { error: "Could not verify the selected recipe" },
      { status: 500 }
    );
  }
  if (!recipe) {
    return NextResponse.json(
      { error: "The selected recipe was not found" },
      { status: 404 }
    );
  }
  if (normalizeType(recipe.type) !== normalizeType(batch.type)) {
    return NextResponse.json(
      { error: "Choose a recipe with the same batch type" },
      { status: 400 }
    );
  }

  const recipeSnapshot = Object.fromEntries(
    SNAPSHOT_FIELDS.filter((field) => field in recipe).map((field) => [
      field,
      recipe[field],
    ])
  );
  const batchUpdate =
    recipe.batch_id === batch.id
      ? { recipe_id: recipe.id }
      : { recipe_id: recipe.id, recipe_snapshot: recipeSnapshot };
  const { data: updatedBatch, error: updateError } = await serviceRole
    .from("batches")
    .update(batchUpdate)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (updateError) {
    console.error("Could not link recipe to batch", updateError);
    if (["42703", "PGRST204"].includes(updateError.code ?? "")) {
      return NextResponse.json(
        { error: "Apply the batch lifecycle database migration before linking recipes." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not link the selected recipe to this batch" },
      { status: 500 }
    );
  }
  if (!updatedBatch) {
    return NextResponse.json(
      { error: "Batch not found or access denied" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    recipe: { id: recipe.id, name: recipe.name, type: recipe.type },
  });
}
