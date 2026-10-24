import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { PUBLIC_RECIPE_DETAILS } from "@/lib/recipes/publicRecipes";
import {
  FREE_RECIPE_LIMIT,
  getRecipeLimitStatus,
  recipeLimitError,
} from "@/lib/recipes/limits";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, serviceRole } = supabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to start a batch." }, { status: 401 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }
  const { data: source, error } = await serviceRole.from("recipes")
    .select(`${PUBLIC_RECIPE_DETAILS}, malt_warnings`)
    .eq("id", params.id).eq("is_public", true).maybeSingle();
  if (error) {
    console.error("Could not load public recipe for brewing", error);
    return NextResponse.json({ error: "Could not load this recipe." }, { status: 500 });
  }
  if (!source) return NextResponse.json({ error: "This recipe is no longer publicly available." }, { status: 404 });
  const { data: author, error: authorError } = await serviceRole.from("profiles")
    .select("id").eq("id", source.user_id).eq("is_public", true).maybeSingle();
  if (authorError) {
    console.error("Could not verify public recipe author", authorError);
    return NextResponse.json({ error: "Could not verify this recipe's author." }, { status: 500 });
  }
  if (!author) return NextResponse.json({ error: "This recipe is no longer publicly available." }, { status: 404 });
  if (source.user_id === user.id) return NextResponse.json({ recipeId: source.id });

  const { data: existing, error: existingError } = await supabase.from("recipes")
    .select("id").eq("user_id", user.id).eq("source_recipe_id", source.id)
    .order("created_at").limit(1).maybeSingle();
  if (existingError) {
    console.error("Could not check saved recipe version", existingError);
    return NextResponse.json({ error: "Could not check your saved recipes." }, { status: 500 });
  }
  if (existing) return NextResponse.json({ recipeId: existing.id });

  let limitStatus: Awaited<ReturnType<typeof getRecipeLimitStatus>>;
  try {
    limitStatus = await getRecipeLimitStatus(serviceRole, user.id);
  } catch (limitError) {
    console.error("Could not verify saved recipe limit", limitError);
    return NextResponse.json(
      { error: "Could not verify your recipe limit. Please try again." },
      { status: 500 }
    );
  }
  if (!limitStatus.isPremium) {
    const limitError = recipeLimitError(limitStatus.count);
    if (limitError) {
      return NextResponse.json(
        { error: limitError, upgradeUrl: "/premium", recipeLimit: FREE_RECIPE_LIMIT, recipeCount: limitStatus.count },
        { status: 403 }
      );
    }
  }

  const fields = Object.fromEntries(Object.entries(source).filter(([key]) =>
    !["id", "user_id", "source_recipe_id", "created_at", "copyright_free"].includes(key)
  ));
  const { data: saved, error: saveError } = await supabase.from("recipes").insert({
    ...fields,
    user_id: user.id,
    source_recipe_id: source.id,
    is_public: false,
    copyright_free: false,
    batch_id: null,
  }).select("id").single();
  if (saveError) {
    console.error("Could not save public recipe for brewing", saveError);
    if (saveError.code === "23514" && saveError.message.includes("Free accounts can save")) {
      return NextResponse.json(
        { error: saveError.message, upgradeUrl: "/premium", recipeLimit: FREE_RECIPE_LIMIT },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Could not save a private version of this recipe." }, { status: 500 });
  }
  return NextResponse.json({ recipeId: saved.id }, { status: 201 });
}
