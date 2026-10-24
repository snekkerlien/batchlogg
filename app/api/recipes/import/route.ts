import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import {
  parseBeerJson,
  parseBeerXml,
  type ImportedRecipe,
} from "@/lib/recipes/beerFileFormats";
import {
  parseRecipeCsv,
  recipeCsvRowToInsert,
} from "@/lib/recipes/recipeCsv";
import {
  FREE_RECIPE_LIMIT,
  getRecipeLimitStatus,
  recipeLimitError,
} from "@/lib/recipes/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_RECIPES_PER_FILE = 25;

function validateRecipe(recipe: ImportedRecipe) {
  if (!recipe.name.trim() || recipe.name.length > 120) {
    throw new Error("Each imported recipe must have a name of 1–120 characters.");
  }
  if (!Number.isFinite(recipe.volume) || recipe.volume <= 0 || recipe.volume > 100_000) {
    throw new Error(`"${recipe.name}" has an invalid batch volume.`);
  }
}

export async function POST(request: NextRequest) {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + 65_536) {
    return NextResponse.json({ error: "Recipe files must be 2 MB or smaller." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Upload a CSV, BeerXML, or BeerJSON file." },
      { status: 400 }
    );
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Choose a CSV, BeerXML, or BeerJSON file." },
      { status: 400 }
    );
  }
  if (!/\.(csv|xml|json|beerjson)$/i.test(file.name)) {
    return NextResponse.json(
      { error: "Choose a file with a .csv, .xml, .json, or .beerjson extension." },
      { status: 400 }
    );
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Recipe files must be between 1 byte and 2 MB." },
      { status: 400 }
    );
  }

  let rows: Record<string, unknown>[];
  try {
    const content = await file.text();
    if (/\.csv$/i.test(file.name)) {
      const csvRecipes = parseRecipeCsv(content);
      if (csvRecipes.length > MAX_RECIPES_PER_FILE) {
        return NextResponse.json(
          { error: `A file can contain at most ${MAX_RECIPES_PER_FILE} recipes.` },
          { status: 400 }
        );
      }
      rows = csvRecipes.map((recipe) => recipeCsvRowToInsert(recipe, user.id));
    } else {
      const importedRecipes: ImportedRecipe[] = /\.xml$/i.test(file.name)
        ? parseBeerXml(content)
        : parseBeerJson(content);
      if (importedRecipes.length > MAX_RECIPES_PER_FILE) {
        return NextResponse.json(
          { error: `A file can contain at most ${MAX_RECIPES_PER_FILE} recipes.` },
          { status: 400 }
        );
      }
      importedRecipes.forEach(validateRecipe);
      rows = importedRecipes.map((recipe) => ({
        user_id: user.id,
        type: recipe.type,
        name: recipe.name.trim(),
        volume: recipe.volume,
        og: recipe.og,
        fg: recipe.fg,
        abv: recipe.abv,
        ingredients:
          recipe.type === "Beer"
            ? {
                beer_subtype: recipe.beer_subtype,
                beer_style: recipe.beer_style,
                kit_url: null,
              }
            : recipe.ingredients,
        malts: recipe.malts,
        hops: recipe.hops,
        dry_hops: recipe.dry_hops,
        yeast: recipe.yeast,
        additives: recipe.additives,
        full_process: recipe.full_process,
        notes: recipe.notes,
        boil_time: recipe.boil_time,
        boil_volume: recipe.boil_volume,
        steps: recipe.steps,
        is_public: false,
      }));
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read the recipe file.",
      },
      { status: 400 }
    );
  }

  const { serviceRole } = supabaseServer();
  let recipeLimitStatus: Awaited<ReturnType<typeof getRecipeLimitStatus>>;
  try {
    recipeLimitStatus = await getRecipeLimitStatus(serviceRole, user.id);
  } catch (error) {
    console.error("Could not verify recipe import limit", error);
    return NextResponse.json(
      { error: "Could not verify your recipe limit. Please try again." },
      { status: 500 }
    );
  }
  if (!recipeLimitStatus.isPremium) {
    const limitError = recipeLimitError(recipeLimitStatus.count, rows.length);
    if (limitError) {
      return NextResponse.json(
        { error: limitError, upgradeUrl: "/premium", recipeLimit: FREE_RECIPE_LIMIT, recipeCount: recipeLimitStatus.count },
        { status: 403 }
      );
    }
  }

  const { data, error } = await supabase
    .from("recipes")
    .insert(rows)
    .select("*");
  if (error) {
    console.error("Could not save imported recipes", error);
    if (error.code === "23514" && error.message.includes("Free accounts can save")) {
      return NextResponse.json(
        { error: error.message, upgradeUrl: "/premium", recipeLimit: FREE_RECIPE_LIMIT },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Recipes were parsed but could not be saved." },
      { status: 500 }
    );
  }

  return NextResponse.json({ recipes: data ?? [] }, { status: 201 });
}
