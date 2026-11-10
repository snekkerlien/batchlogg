export function visibleAchievementCategories<T extends { stat: string }>(
  categories: readonly T[],
  reviewsVisible: boolean
): T[] {
  return categories.filter((category) => category.stat !== "totalRatings" || reviewsVisible);
}
