import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { premiumGateResponse } from "@/lib/auth/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const accessDenied = await premiumGateResponse(serviceRole, user.id);
  if (accessDenied) return accessDenied;

  const { data: recipe, error: recipeError } = await serviceRole
    .from("recipes")
    .select("id, user_id, name")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (recipeError) {
    console.error("Could not load recipe for version history", recipeError);
    return NextResponse.json({ error: "Could not load recipe" }, { status: 500 });
  }
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  const [
    { data: currentRecipe, error: currentError },
    { data: versions, error: versionsError },
  ] = await Promise.all([
    serviceRole.from("recipes").select("*").eq("id", params.id).eq("user_id", user.id).single(),
    serviceRole
      .from("recipe_versions")
      .select("id, version_number, recipe_snapshot, change_note, created_at")
      .eq("recipe_id", params.id)
      .eq("user_id", user.id)
      .order("version_number", { ascending: true }),
  ]);
  if (currentError || versionsError) {
    console.error("Could not load recipe version history", currentError || versionsError);
    return NextResponse.json({ error: "Could not load recipe version history" }, { status: 500 });
  }

  return NextResponse.json({ recipe: currentRecipe, versions: versions ?? [] });
}
