export const BATCH_GUIDE_MILESTONES = [
  "first-batch",
  "secondary",
  "conditioning",
  "bottling",
] as const;

export type BatchGuideMilestone = (typeof BATCH_GUIDE_MILESTONES)[number];

type BatchGuideUser = {
  user_metadata?: Record<string, unknown>;
};

export function isBatchGuideMilestone(
  value: unknown
): value is BatchGuideMilestone {
  return (
    typeof value === "string" &&
    BATCH_GUIDE_MILESTONES.includes(value as BatchGuideMilestone)
  );
}

export function isBatchGuideDismissed(
  user: BatchGuideUser,
  milestone: BatchGuideMilestone
) {
  const dismissed = user.user_metadata?.batchlogg_batch_guide_dismissed;
  return (
    typeof dismissed === "object" &&
    dismissed !== null &&
    !Array.isArray(dismissed) &&
    (dismissed as Record<string, unknown>)[milestone] === true
  );
}
