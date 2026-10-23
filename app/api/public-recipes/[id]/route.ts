import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { PUBLIC_RECIPE_DETAILS } from "@/lib/recipes/publicRecipes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }
  const { serviceRole } = supabaseServer();
  const { data: recipe, error } = await serviceRole
    .from("recipes")
    .select(PUBLIC_RECIPE_DETAILS)
    .eq("id", params.id)
    .eq("is_public", true)
    .maybeSingle();
  if (error) {
    console.error("Could not load public recipe details", error);
    return NextResponse.json({ error: "Could not load recipe details. Please try again." }, { status: 500 });
  }
  if (!recipe) return NextResponse.json({ error: "This recipe is no longer publicly available." }, { status: 404 });

  const { data: author, error: authorError } = await serviceRole
    .from("profiles")
    .select("id")
    .eq("id", recipe.user_id)
    .eq("is_public", true)
    .maybeSingle();
  if (authorError) {
    console.error("Could not verify public recipe author", authorError);
    return NextResponse.json({ error: "Could not load recipe details. Please try again." }, { status: 500 });
  }
  if (!author) return NextResponse.json({ error: "This recipe is no longer publicly available." }, { status: 404 });
  return NextResponse.json({ recipe }, { headers: { "Cache-Control": "no-store" } });
}
