import type { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import {
  COMMUNITY_ACHIEVEMENT_TIERS,
  RATING_ACHIEVEMENT_TIERS,
} from "@/lib/community/achievementTiers";

type ServiceRole = ReturnType<typeof supabaseServer>["serviceRole"];

export async function ensureCommunityAndRatingAchievementNotifications(
  serviceRole: ServiceRole,
  userId: string
) {
  const [
    { count: topicCount, error: topicsError },
    { count: replyCount, error: repliesError },
    { count: ratingCount, error: ratingsError },
  ] = await Promise.all([
    serviceRole
      .from("forum_topics")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId),
    serviceRole
      .from("forum_replies")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId),
    serviceRole
      .from("brewery_product_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "published"),
  ]);

  const statsError = topicsError || repliesError || ratingsError;
  if (statsError) throw statsError;

  const progressByCategory = {
    Community: {
      progress: (topicCount ?? 0) + (replyCount ?? 0),
      tiers: COMMUNITY_ACHIEVEMENT_TIERS,
    },
    Ratings: {
      progress: ratingCount ?? 0,
      tiers: RATING_ACHIEVEMENT_TIERS,
    },
  } as const;

  const unlocked = Object.entries(progressByCategory).flatMap(
    ([category, { progress, tiers }]) =>
      tiers
        .filter(([, goal]) => progress >= goal)
        .map(([achievement_name, goal]) => ({
          category,
          goal,
          achievement_name,
        }))
  );
  if (!unlocked.length) return;

  const { data: existingNotifications, error: existingError } = await serviceRole
    .from("achievement_notifications")
    .select("category, goal")
    .eq("recipient_id", userId)
    .in("category", ["Community", "Ratings"]);
  if (existingError) throw existingError;

  const existingKeys = new Set(
    (existingNotifications ?? []).map(
      (notification) => `${notification.category}:${notification.goal}`
    )
  );
  const missingNotifications = unlocked.filter(
    ({ category, goal }) => !existingKeys.has(`${category}:${goal}`)
  );
  if (!missingNotifications.length) return;

  const { error: insertError } = await serviceRole
    .from("achievement_notifications")
    .insert(
      missingNotifications.map((notification) => ({
        recipient_id: userId,
        ...notification,
      }))
    );
  if (insertError) throw insertError;
}
