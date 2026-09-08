"use server";

import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { redirect } from "next/navigation";

export async function createRecipe(formData: FormData) {
  const { supabase } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
    return;
  }

  const user_id = user.id;

  // Core
  const type = formData.get("type") as string;
  const name = formData.get("name") as string;
  const og = formData.get("og");
  const fg = formData.get("fg");
  const abv = formData.get("abv");
  const volume = formData.get("volume");

  // Shared
  const additives = formData.get("additives") as string;
  const full_process = formData.get("full_process") as string;
  const notes = formData.get("notes") as string;
  const yeast = formData.get("yeast") as string;

  // Mead
  const honey_type = formData.get("honey_type") as string;
  const honey_amount = formData.get("honey_amount") as string;

  const fruits_json = formData.get("fruits_json") as string;
  const fruits = fruits_json ? JSON.parse(fruits_json) : null;

  // Cider / Wine / Seltzer
  const juice_type = formData.get("juice_type") as string;
  const sugar_amount = formData.get("sugar_amount") as string;

  // Beer / Braggot
  const malts_json = formData.get("malts_json") as string;
  const malts = malts_json ? JSON.parse(malts_json) : null;

  const hops_json = formData.get("hops_json") as string;
  const hops = hops_json ? JSON.parse(hops_json) : null;

  const boil_time = formData.get("boil_time") as string;

  // Other
  const ingredients_json = formData.get("ingredients_json") as string;
  const ingredients = ingredients_json ? JSON.parse(ingredients_json) : null;

  const steps_json = formData.get("steps_json") as string;
  const steps = steps_json ? JSON.parse(steps_json) : null;

  // Secondary
  const had_secondary = formData.get("had_secondary") === "true";
  const secondary_additions = formData.get("secondary_additions") as string;
  const secondary_notes = formData.get("secondary_notes") as string;

  const { error } = await supabase.from("recipes").insert({
    user_id,
    type,
    name,
    og,
    fg,
    abv,
    volume,

    // Mead
    honey_type,
    honey_amount,
    fruits,

    // Cider / Wine / Seltzer
    juice_type,
    sugar_amount,

    // Beer / Braggot
    malts,
    hops,
    boil_time,

    // Other
    ingredients,
    steps,

    // Shared
    yeast,
    additives,
    full_process,
    notes,

    // Secondary
    had_secondary,
    secondary_additions,
    secondary_notes,

    is_public: false,
    batch_id: null,
  });

  if (error) {
    console.error("Recipe insert failed:", error);
    throw new Error(error.message);
  }

  redirect("/recipes");
}
