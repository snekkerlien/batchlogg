import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePlanTier } from "@/lib/auth/plan";
import { FREE_RECIPE_LIMIT } from "@/lib/recipes/constants";

export { FREE_RECIPE_LIMIT } from "@/lib/recipes/constants";

export async function getRecipeLimitStatus(
  serviceRole: SupabaseClient,
  userId: string
): Promise<{ count: number; isPremium: boolean }> {
  const [{ data: profile, error: profileError }, { count, error: recipesError }] =
    await Promise.all([
      serviceRole
        .from("profiles")
        .select("account_tier")
        .eq("id", userId)
        .maybeSingle(),
      serviceRole
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  if (profileError) {
    console.error("Could not check recipe account tier", profileError);
    throw new Error("Could not verify your account plan.");
  }
  if (!profile) {
    throw new Error("Could not verify your account plan: profile not found.");
  }
  if (recipesError) {
    console.error("Could not count saved recipes", recipesError);
    throw new Error("Could not check your saved recipe count.");
  }

  return {
    count: count ?? 0,
    isPremium: normalizePlanTier(profile.account_tier) === "premium",
  };
}

export function recipeLimitError(count: number, requestedCount = 1) {
  return count + requestedCount > FREE_RECIPE_LIMIT
    ? `Free accounts can save up to ${FREE_RECIPE_LIMIT} recipes. Delete a recipe or upgrade to Premium to save more.`
    : null;
}
