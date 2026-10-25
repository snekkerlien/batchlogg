import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RESULTS = 8;

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  if (
    (type !== "recipe" && type !== "batch") ||
    search.length > 100
  ) {
    return NextResponse.json({ error: "Invalid mention search." }, { status: 400 });
  }

  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
  if (type === "recipe") {
    const { data: recipes, error: recipeError } = await serviceRole
      .from("recipes")
      .select("id, name, user_id, type, ingredients")
      .eq("is_public", true)
      .eq("user_id", user.id)
      .ilike("name", pattern)
      .order("name", { ascending: true })
      .limit(50);
    if (recipeError) {
      console.error("Could not search public recipes for mentions", recipeError);
      return NextResponse.json({ error: "Could not load public recipes." }, { status: 500 });
    }

    const { data: profile, error: profileError } = await serviceRole
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .eq("is_public", true)
      .maybeSingle();
    if (profileError) {
      console.error("Could not check public recipe profiles for mentions", profileError);
      return NextResponse.json({ error: "Could not load public recipes." }, { status: 500 });
    }
    if (!profile) return NextResponse.json({ mentions: [] });

    return NextResponse.json({
      mentions: (recipes ?? [])
        .slice(0, MAX_RESULTS)
        .map((recipe) => ({
          type: "recipe",
          id: recipe.id,
          name: recipe.name || "Unnamed recipe",
          context: getRecipeContext(recipe.type, recipe.ingredients),
        })),
    });
  }

  const { data: batches, error: batchError } = await serviceRole
    .from("batches")
    .select("id, name, aktivt_kar, user_id, type, status")
    .eq("user_id", user.id)
    .not("aktivt_kar", "is", null)
    .ilike("name", pattern)
    .order("created_at", { ascending: false })
    .limit(50);
  if (batchError) {
    console.error("Could not search public batches for mentions", batchError);
    return NextResponse.json({ error: "Could not load public batches." }, { status: 500 });
  }

  const vesselIds = [...new Set((batches ?? []).map((batch) => batch.aktivt_kar))];
  const { data: vessels, error: vesselError } = vesselIds.length
    ? await serviceRole
        .from("kar")
        .select("id")
        .in("id", vesselIds)
        .eq("is_public", true)
    : { data: [], error: null };
  if (vesselError) {
    console.error("Could not check public batch vessels for mentions", vesselError);
    return NextResponse.json({ error: "Could not load public batches." }, { status: 500 });
  }

  const publicVessels = new Set((vessels ?? []).map((vessel) => vessel.id));
  return NextResponse.json({
    mentions: (batches ?? [])
      .filter((batch) => publicVessels.has(batch.aktivt_kar))
      .slice(0, MAX_RESULTS)
      .map((batch) => ({
        type: "batch",
        id: batch.id,
        name: batch.name || "Unnamed batch",
        context: getBatchContext(batch.type, batch.status),
      })),
  });
}

function getRecipeContext(type: string | null, ingredients: unknown) {
  const recipeType = type?.trim() || "Recipe";
  if (recipeType.toLowerCase() !== "beer" || !ingredients || typeof ingredients !== "object") {
    return recipeType;
  }

  const style = "beer_style" in ingredients ? ingredients.beer_style : null;
  return typeof style === "string" && style.trim()
    ? `${recipeType} · ${style.trim()}`
    : recipeType;
}

function getBatchContext(type: string | null, status: string | null) {
  const batchType = type?.trim() || "Batch";
  const statusLabel = status?.trim().replace(/^./, (character) => character.toLocaleUpperCase());
  return statusLabel ? `${batchType} · ${statusLabel}` : batchType;
}
