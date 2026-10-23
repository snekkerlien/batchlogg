export function forumDraftKey(topicId: string, userId: string | null) {
  return `batchlogg:forum-reply:${userId ?? "guest"}:${topicId}`;
}

export type ForumReplyDraft = {
  body: string;
  attachments: string[];
  hadImages: boolean;
};

export function parseForumReplyDraft(value: string | null): ForumReplyDraft | null {
  if (!value) return null;
  const draft: unknown = JSON.parse(value);
  if (
    !draft || typeof draft !== "object" ||
    !("body" in draft) || typeof draft.body !== "string" ||
    !("attachments" in draft) || !Array.isArray(draft.attachments) ||
    !draft.attachments.every(item => typeof item === "string") ||
    !("hadImages" in draft) || typeof draft.hadImages !== "boolean"
  ) throw new Error("The saved reply draft has an invalid format.");
  return { body: draft.body, attachments: draft.attachments, hadImages: draft.hadImages };
}

export function forumTopicHref(topicId: string) {
  return `/community/forum/${encodeURIComponent(topicId)}`;
}
