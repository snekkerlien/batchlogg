export function recipeOwnerFilter(userId: string) {
  return ["user_id", userId] as const;
}
