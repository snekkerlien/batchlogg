import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { decodeForumContent } from "@/lib/community/forumContent";

export const runtime = "nodejs";

const recipeFields = [
  "type",
  "name",
  "og",
  "fg",
  "abv",
  "ibu",
  "ebc",
  "volume",
  "honey_type",
  "honey_amount",
  "base_liquid",
  "base_liquid_amount",
  "fruits",
  "juice_type",
  "sugar_amount",
  "malts",
  "hops",
  "dry_hops",
  "boil_time",
  "boil_volume",
  "ingredients",
  "steps",
  "yeast",
  "additives",
  "full_process",
  "notes",
  "had_secondary",
  "secondary_additions",
  "secondary_notes",
  "malt_warnings",
] as const;

export async function POST(request: Request) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to make a recipe version." }, { status: 401 });
  }

  let body: { recipeId?: unknown; topicId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof body.recipeId !== "string" ||
    typeof body.topicId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.recipeId
    ) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.topicId
    )
  ) {
    return NextResponse.json({ error: "A valid recipe is required." }, { status: 400 });
  }

  const { data: source, error: sourceError } = await serviceRole
    .from("recipes")
    .select(
      "id, user_id, type, name, og, fg, abv, ibu, ebc, volume, honey_type, honey_amount, base_liquid, base_liquid_amount, fruits, juice_type, sugar_amount, malts, hops, dry_hops, boil_time, boil_volume, ingredients, steps, yeast, additives, full_process, notes, had_secondary, secondary_additions, secondary_notes, malt_warnings"
    )
    .eq("id", body.recipeId)
    .eq("is_public", true)
    .maybeSingle();

  if (sourceError) {
    console.error("Could not load public recipe for versioning", sourceError);
    return NextResponse.json({ error: "Could not load the shared recipe." }, { status: 500 });
  }
  if (!source) {
    return NextResponse.json({ error: "This recipe is no longer publicly available." }, { status: 404 });
  }

  const { data: author, error: authorError } = await serviceRole
    .from("profiles")
    .select("id")
    .eq("id", source.user_id)
    .eq("is_public", true)
    .maybeSingle();

  if (authorError) {
    console.error("Could not verify public recipe author", authorError);
    return NextResponse.json({ error: "Could not verify the shared recipe." }, { status: 500 });
  }
  if (!author) {
    return NextResponse.json({ error: "This recipe is no longer publicly available." }, { status: 404 });
  }

  const { data: communityTopic, error: topicError } = await serviceRole
    .from("forum_topics")
    .select("id, body")
    .eq("id", body.topicId)
    .eq("is_community_recipe", true)
    .maybeSingle();

  if (topicError) {
    console.error("Could not verify community recipe forum post", topicError);
    if (["42703", "PGRST204"].includes(topicError.code ?? "")) {
      return NextResponse.json(
        { error: "Apply the community recipe database migration before making a version." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Could not verify the community recipe post." }, { status: 500 });
  }
  if (
    !communityTopic ||
    !decodeForumContent(communityTopic.body).attachments.some(
      (attachment) => attachment.type === "recipe" && attachment.id === source.id
    )
  ) {
    return NextResponse.json(
      { error: "This recipe is not shared in a community recipe post." },
      { status: 403 }
    );
  }

  const newRecipe: Record<string, unknown> = {
    user_id: user.id,
    source_recipe_id: source.id,
    is_public: false,
    batch_id: null,
  };
  for (const field of recipeFields) {
    newRecipe[field] = source[field];
  }

  const { data: fork, error: insertError } = await serviceRole
    .from("recipes")
    .insert(newRecipe)
    .select("id")
    .single();

  if (insertError) {
    console.error("Could not create recipe version", insertError);
    return NextResponse.json({ error: "Could not create your recipe version." }, { status: 500 });
  }

  return NextResponse.json({ recipeId: fork.id }, { status: 201 });
}
