import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import {
  COMMUNITY_ACHIEVEMENT_TIERS,
  RATING_ACHIEVEMENT_TIERS,
} from "@/lib/community/achievementTiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AchievementRow = {
  id: string;
  user_id?: string | null;
  author_id?: string | null;
};

async function loadUserCounts<T extends AchievementRow>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
  userIdForRow: (row: T) => string | null | undefined
) {
  const counts = new Map<string, number>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;

    for (const row of data ?? []) {
      const userId = userIdForRow(row);
      if (userId) counts.set(userId, (counts.get(userId) ?? 0) + 1);
    }
    if (!data || data.length < pageSize) return counts;
  }
}

async function loadRecipeCounts(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: { id: string; user_id: string; is_public: boolean }[] | null;
    error: { message: string } | null;
  }>
) {
  const total = new Map<string, number>();
  const publicRecipes = new Map<string, number>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;

    for (const recipe of data ?? []) {
      total.set(recipe.user_id, (total.get(recipe.user_id) ?? 0) + 1);
      if (recipe.is_public) {
        publicRecipes.set(
          recipe.user_id,
          (publicRecipes.get(recipe.user_id) ?? 0) + 1
        );
      }
    }
    if (!data || data.length < pageSize) return { total, publicRecipes };
  }
}

function percentileForTier(
  progress: number,
  goals: number[],
  counts: Map<string, number>,
  totalUsers: number
) {
  let highestUnlockedGoal = 0;
  for (const goal of goals) {
    if (progress >= goal) highestUnlockedGoal = goal;
  }
  if (!highestUnlockedGoal) return null;

  let usersAtOrAboveTier = 0;
  for (const count of counts.values()) {
    if (count >= highestUnlockedGoal) usersAtOrAboveTier += 1;
  }
  return Math.ceil((usersAtOrAboveTier / totalUsers) * 100);
}

export async function GET() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const [
      { count: totalUsers, error: profilesError },
      batchCounts,
      recipeCountsByType,
      topicCounts,
      replyCounts,
      ratingCounts,
    ] = await Promise.all([
      serviceRole.from("profiles").select("id", { count: "exact", head: true }),
      loadUserCounts(
        (from, to) =>
          serviceRole
            .from("batches")
            .select("id, user_id")
            .order("id", { ascending: true })
            .range(from, to),
        (row) => row.user_id
      ),
      loadRecipeCounts(
        (from, to) =>
          serviceRole
            .from("recipes")
            .select("id, user_id, is_public")
            .order("id", { ascending: true })
            .range(from, to),
      ),
      loadUserCounts(
        (from, to) =>
          serviceRole
            .from("forum_topics")
            .select("id, author_id")
            .order("id", { ascending: true })
            .range(from, to),
        (row) => row.author_id
      ),
      loadUserCounts(
        (from, to) =>
          serviceRole
            .from("forum_replies")
            .select("id, author_id")
            .order("id", { ascending: true })
            .range(from, to),
        (row) => row.author_id
      ),
      loadUserCounts(
        (from, to) =>
          serviceRole
            .from("brewery_product_reviews")
            .select("id, user_id")
            .eq("status", "published")
            .order("id", { ascending: true })
            .range(from, to),
        (row) => row.user_id
      ),
    ]);

    if (profilesError || totalUsers === null || totalUsers < 1) {
      console.error("Could not count profiles for achievement rankings", profilesError);
      return NextResponse.json(
        { error: "Could not load achievement rankings" },
        { status: 500 }
      );
    }

    const allForumCounts = new Map<string, number>(topicCounts);
    const { total: recipeCounts, publicRecipes: publicRecipeCounts } =
      recipeCountsByType;
    for (const [userId, count] of replyCounts) {
      allForumCounts.set(userId, (allForumCounts.get(userId) ?? 0) + count);
    }
    const categoryPercentiles = {
      Brewing: percentileForTier(
        batchCounts.get(user.id) ?? 0,
        [1, 2, 3, 5, 8, 10, 15, 20, 25, 35, 50, 75, 100, 150, 200, 250, 300, 400, 450, 500],
        batchCounts,
        totalUsers
      ),
      "Recipe craft": percentileForTier(
        recipeCounts.get(user.id) ?? 0,
        [1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 85, 90, 95, 100],
        recipeCounts,
        totalUsers
      ),
      Sharing: percentileForTier(
        publicRecipeCounts.get(user.id) ?? 0,
        [1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 85, 90, 95, 100],
        publicRecipeCounts,
        totalUsers
      ),
      Community: percentileForTier(
        (topicCounts.get(user.id) ?? 0) + (replyCounts.get(user.id) ?? 0),
        COMMUNITY_ACHIEVEMENT_TIERS.map(([, goal]) => goal),
        allForumCounts,
        totalUsers
      ),
      Ratings: percentileForTier(
        ratingCounts.get(user.id) ?? 0,
        RATING_ACHIEVEMENT_TIERS.map(([, goal]) => goal),
        ratingCounts,
        totalUsers
      ),
    };

    return NextResponse.json({ categoryPercentiles });
  } catch (rankingError) {
    console.error("Could not load achievement rankings", rankingError);
    return NextResponse.json(
      { error: "Could not load achievement rankings" },
      { status: 500 }
    );
  }
}
