"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import PageHeading from "@/app/components/PageHeading";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import ReportContentButton from "@/app/components/ReportContentButton";
import PublicMentionTextarea from "@/app/components/PublicMentionTextarea";
import PublicMentionText from "@/app/components/PublicMentionText";
import { forumDraftKey, forumTopicHref, parseForumReplyDraft } from "@/lib/community/forumDraft";
import {
  encodeForumContent,
  FORUM_CATEGORIES,
  isForumCategory,
  type ForumCategory,
  type ForumAttachment,
  type ForumAttachmentRef,
  FORUM_IMAGE_TYPES,
  ForumImage,
  MAX_FORUM_IMAGE_SIZE,
  MAX_FORUM_IMAGES,
} from "@/lib/community/forumContent";

interface ForumAuthor {
  id: string;
  username: string;
  profileUsername: string | null;
  avatar_url: string | null;
}

function AuthorLink({ author }: { author: ForumAuthor }) {
  const content = (
    <>
      <Image
        src={author.avatar_url || "/default-avatar.png"}
        alt=""
        width={24}
        height={24}
        sizes="24px"
        unoptimized
        className="h-6 w-6 rounded-full border border-white/20 object-cover"
      />
      <span>{author.username}</span>
    </>
  );

  if (!author.profileUsername) {
    return <span className="inline-flex items-center gap-2 align-middle">{content}</span>;
  }

  return (
    <Link
      href={`/members/${encodeURIComponent(author.profileUsername)}`}
      className="inline-flex items-center gap-2 align-middle hover:text-white hover:underline"
    >
      {content}
    </Link>
  );
}

interface ForumReply {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  liked_by_user: boolean;
  author: ForumAuthor;
  images: ForumImage[];
  attachments: ForumAttachment[];
}

interface ForumTopic {
  id: string;
  author_id: string;
  title: string;
  body: string;
  category: ForumCategory;
  is_community_recipe: boolean;
  created_at: string;
  updated_at: string;
  like_count: number;
  liked_by_user: boolean;
  bookmarked_by_user: boolean;
  author: ForumAuthor;
  images: ForumImage[];
  attachments: ForumAttachment[];
  replies: ForumReply[];
}

interface ForumMute {
  ends_at: string | null;
  reason: string | null;
}

function ForumLikeButton({
  contentId,
  contentType,
  count,
  liked,
  userId,
  pending,
  onToggle,
}: {
  contentId: string;
  contentType: "topic" | "reply";
  count: number;
  liked: boolean;
  userId: string | null;
  pending: boolean;
  onToggle: (contentType: "topic" | "reply", contentId: string, liked: boolean) => void;
}) {
  if (!userId) {
    return (
      <Link
        href="/auth/login"
        aria-label={`Sign in to like this ${contentType}`}
        className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white"
      >
        <span aria-hidden="true">♡</span>
        <span>{count}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(contentType, contentId, !liked)}
      disabled={pending}
      aria-label={`${liked ? "Unlike" : "Like"} ${contentType} (${count})`}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1.5 text-sm disabled:cursor-wait disabled:opacity-50 ${
        liked ? "text-pink-300" : "text-white/60 hover:text-white"
      }`}
    >
      <svg
        aria-hidden="true"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
      </svg>
      <span>{count}</span>
    </button>
  );
}

interface ForumAttachmentChoice extends ForumAttachmentRef {
  key: string;
  label: string;
}

const ACCEPTED_FORUM_IMAGE_TYPES = new Set<string>(FORUM_IMAGE_TYPES);

type PendingDelete =
  | { type: "topic"; topic: ForumTopic }
  | { type: "reply"; reply: ForumReply };

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
}

async function submitForumMutation(
  method: "POST" | "PATCH" | "DELETE",
  payload: Record<string, unknown>
) {
  const response = await fetch("/api/community/forum/mutations", {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result: { error?: string } = await response.json();
  if (!response.ok) {
    if (response.status === 401) throw new ForumSignInRequiredError();
    throw new Error(result.error || "Could not update forum content");
  }
}

class ForumSignInRequiredError extends Error {
  constructor() {
    super("Your session has expired. Your reply draft is kept below; sign in to post it.");
  }
}

function ForumImages({ images }: { images: ForumImage[] }) {
  if (!images.length) return null;
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {images.map((image) => (
        <a
          key={image.path}
          href={image.url}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border border-white/10"
        >
          <Image
            src={image.url}
            alt="Image attached to forum post"
            width={640}
            height={384}
            sizes="(max-width: 640px) 100vw, 50vw"
            unoptimized
            loading="lazy"
            className="max-h-96 w-full object-contain"
          />
        </a>
      ))}
    </div>
  );
}

function ForumAttachmentCards({
  attachments,
  communityTopicId,
  forkingRecipeId,
  addedRecipeIds,
  onMakeVersion,
}: {
  attachments: ForumAttachment[];
  communityTopicId?: string;
  forkingRecipeId?: string | null;
  addedRecipeIds?: Set<string>;
  onMakeVersion?: (recipeId: string, topicId: string) => void;
}) {
  if (!attachments.length) return null;
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {attachments.map((attachment) => {
        const card = (
          <span className="block min-w-0 rounded-lg border border-white/10 bg-black/25 p-3">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-green-300">
              {attachment.type}
            </span>
            <span className="mt-1 block truncate text-sm font-medium">
              {attachment.name}
            </span>
            {attachment.url && (
              <span className="mt-1 block text-xs text-white/50">Open attachment →</span>
            )}
          </span>
        );
        const isCommunityRecipe =
          attachment.type === "recipe" && communityTopicId && onMakeVersion;
        return (
          <div key={`${attachment.type}:${attachment.id}`} className="min-w-0">
            {attachment.url ? (
              <a
                href={attachment.url}
                className="block rounded-lg transition hover:border-green-400/30 hover:bg-white/5"
              >
                {card}
              </a>
            ) : card}
            {isCommunityRecipe && (
              <button
                type="button"
                disabled={forkingRecipeId !== null || addedRecipeIds?.has(attachment.id)}
                onClick={() => onMakeVersion(attachment.id, communityTopicId)}
                aria-live="polite"
                className="mt-2 rounded-lg border border-green-400/30 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-100 transition hover:bg-green-500/20 disabled:opacity-80"
              >
                {addedRecipeIds?.has(attachment.id)
                  ? "Added to your recipes"
                  : forkingRecipeId === attachment.id
                    ? "Adding to your recipes…"
                    : "Make my version"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ForumAttachmentPicker({
  choices,
  value,
  onChange,
  disabled,
}: {
  choices: ForumAttachmentChoice[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      Attach recipes or active batches
      <select
        multiple
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
        }
        className="mt-2 min-h-28 w-full rounded-lg border border-white/20 bg-black/40 p-2 text-sm"
      >
        {choices.map((choice) => (
          <option key={choice.key} value={choice.key}>
            {choice.label}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs font-normal text-white/50">
        Select one or more items. Use Ctrl or Cmd to select multiple.
      </span>
    </label>
  );
}

function ForumImagePicker({
  files,
  onChange,
  setError,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  setError: (message: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        Attach images (up to {MAX_FORUM_IMAGES}, JPEG/PNG/WebP, {MAX_FORUM_IMAGE_SIZE / (1024 * 1024)} MB each)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled}
          onChange={(event) => {
            const selected = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            if (files.length + selected.length > MAX_FORUM_IMAGES) {
              setError(`You can attach up to ${MAX_FORUM_IMAGES} images.`);
              return;
            }
            if (selected.some((file) => !ACCEPTED_FORUM_IMAGE_TYPES.has(file.type))) {
              setError("Images must be JPEG, PNG, or WebP files.");
              return;
            }
            if (selected.some((file) => file.size === 0 || file.size > MAX_FORUM_IMAGE_SIZE)) {
              setError("Each image must be smaller than 5 MB.");
              return;
            }
            setError("");
            onChange([...files, ...selected]);
          }}
          className="mt-2 block w-full rounded-lg border border-white/20 bg-black/40 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
        />
      </label>
      {files.length > 0 && (
        <ul className="space-y-1 text-sm text-white/70">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3">
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
                className="shrink-0 text-white/60 underline hover:text-white disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function uploadForumImages(files: File[]) {
  if (!files.length) return [] as ForumImage[];
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  const response = await fetch("/api/community/forum/images", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const result = await response.json();
  if (response.status === 401) throw new ForumSignInRequiredError();
  if (!response.ok) throw new Error(result.error || "Could not upload images");
  return result.images as ForumImage[];
}

async function cleanUpForumImages(images: ForumImage[]) {
  if (!images.length) return;
  const response = await fetch("/api/community/forum/images", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ paths: images.map((image) => image.path) }),
  });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || "Could not clean up uploaded images");
  }
}

export default function ForumClient({ threadId }: { threadId?: string }) {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [topicPage, setTopicPage] = useState(1);
  const [hasMoreTopics, setHasMoreTopics] = useState(false);
  const [loadingMoreTopics, setLoadingMoreTopics] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [canModerate, setCanModerate] = useState(false);
  const [mute, setMute] = useState<ForumMute | null>(null);
  const [muteModalOpen, setMuteModalOpen] = useState(false);
  const [muteRemaining, setMuteRemaining] = useState<number | null>(null);
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [communityRecipeModalOpen, setCommunityRecipeModalOpen] = useState(false);
  const [communityRecipeId, setCommunityRecipeId] = useState("");
  const [communityRecipeTitle, setCommunityRecipeTitle] = useState("");
  const [communityRecipeBody, setCommunityRecipeBody] = useState("");
  const [forkingRecipeId, setForkingRecipeId] = useState<string | null>(null);
  const [addedRecipeIds, setAddedRecipeIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    ForumCategory | "All categories"
  >("All categories");
  const [topicSearch, setTopicSearch] = useState("");
  const [topicSort, setTopicSort] = useState<"newest" | "oldest" | "popular" | "active">("newest");
  const [savedOnly, setSavedOnly] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ForumCategory>("Brewing");
  const [topicImages, setTopicImages] = useState<File[]>([]);
  const [topicAttachments, setTopicAttachments] = useState<string[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [replyImages, setReplyImages] = useState<File[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<string[]>([]);
  const [attachmentChoices, setAttachmentChoices] = useState<ForumAttachmentChoice[]>([]);
  const unavailableReplyAttachments = replyAttachments.filter(
    key => !attachmentChoices.some(choice => choice.key === key)
  );
  const [linkedTopicId, setLinkedTopicId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replyNeedsSignIn, setReplyNeedsSignIn] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [copiedTopicId, setCopiedTopicId] = useState<string | null>(null);
  const openedReply = useRef<string | null>(null);

  function saveReplyDraft(topicId: string, text: string, attachments: string[], images: File[]) {
    try {
      const key = forumDraftKey(topicId, userId);
      if (!text && attachments.length === 0 && images.length === 0) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify({ body: text, attachments, hadImages: images.length > 0 }));
      setDraftMessage("Draft saved on this device. Images must be reselected after leaving this page.");
    } catch (storageError) {
      console.error("Could not save forum reply draft", storageError);
      setDraftMessage("This browser could not save your draft. Keep this page open or copy your reply before leaving.");
    }
  }

  const openReply = useCallback((topicId: string) => {
    setReplyingTo(topicId);
    setReplyBody("");
    setReplyImages([]);
    setReplyAttachments([]);
    setReplyError("");
    setReplyNeedsSignIn(false);
    setDraftMessage("");
    try {
      const raw = localStorage.getItem(forumDraftKey(topicId, userId)) ??
        (userId ? localStorage.getItem(forumDraftKey(topicId, null)) : null);
      const draft = parseForumReplyDraft(raw);
      if (draft) {
        setReplyBody(draft.body);
        setReplyAttachments(draft.attachments);
        setDraftMessage(`Saved draft restored.${draft.hadImages ? " Reselect your images before posting." : ""}`);
      }
    } catch (storageError) {
      console.error("Could not restore forum reply draft", storageError);
      setDraftMessage("Your saved draft could not be restored. Browser storage may be unavailable.");
    }
  }, [userId]);

  async function copyTopicLink(topicId: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${forumTopicHref(topicId)}`);
      setCopiedTopicId(topicId);
    } catch (copyError) {
      console.error("Could not copy discussion link", copyError);
      setError("The link could not be copied. Use the discussion title's link to open or share it.");
    }
  }
  const normalizedTopicSearch = topicSearch.trim().toLocaleLowerCase();
  const visibleTopics = topics
    .filter((topic) => {
      const categoryMatches =
        selectedCategory === "All categories" || topic.category === selectedCategory;
      const savedMatches = !savedOnly || topic.bookmarked_by_user;
      const searchMatches =
        !normalizedTopicSearch ||
        [topic.title, topic.body, ...topic.replies.map((reply) => reply.body)]
          .some((text) => text.toLocaleLowerCase().includes(normalizedTopicSearch));
      return categoryMatches && savedMatches && searchMatches;
    })
    .sort((a, b) => {
      if (topicSort === "popular") {
        return b.like_count - a.like_count ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (topicSort === "active") {
        const latestActivity = (topic: ForumTopic) =>
          Math.max(
            new Date(topic.created_at).getTime(),
            ...topic.replies.map((reply) => new Date(reply.created_at).getTime())
          );
        return latestActivity(b) - latestActivity(a);
      }
      const direction = topicSort === "newest" ? -1 : 1;
      return direction * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
  const isMuted = mute !== null;

  useEffect(() => {
    if (!isMuted) return;
    setTopicModalOpen(false);
    setCommunityRecipeModalOpen(false);
    setReplyingTo(null);
  }, [isMuted]);

  const loadTopics = useCallback(async (requestedTopicId?: string) => {
    const selectedTopicId = threadId ?? requestedTopicId ??
      new URLSearchParams(window.location.search).get("topic") ??
      (window.location.hash.startsWith("#forum-topic-") ? window.location.hash.slice("#forum-topic-".length) : null);
    const query = selectedTopicId
      ? `?topic_id=${encodeURIComponent(selectedTopicId)}`
      : "?page=1";
    const response = await fetch(`/api/community/forum${query}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Forum request failed (${response.status})`);
    }

    const data: {
      topics: ForumTopic[];
      canModerate?: boolean;
      hasMore?: boolean;
      mute?: ForumMute | null;
    } = await response.json();
    setTopics(data.topics);
    setLinkedTopicId(selectedTopicId);
    setTopicPage(1);
    setHasMoreTopics(data.hasMore === true);
    setCanModerate(data.canModerate === true);
    setMute(data.mute ?? null);
    if (data.mute) setMuteModalOpen(true);
  }, [threadId]);

  async function loadMoreTopics() {
    if (!hasMoreTopics || loadingMoreTopics) return;
    setLoadingMoreTopics(true);
    setLoadMoreError("");
    try {
      const nextPage = topicPage + 1;
      const response = await fetch(
        `/api/community/forum?page=${nextPage}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(`Forum request failed (${response.status})`);
      }
      const data: { topics: ForumTopic[]; hasMore?: boolean; mute?: ForumMute | null } =
        await response.json();
      setMute(data.mute ?? null);
      if (data.mute) setMuteModalOpen(true);
      setTopics((current) => {
        const existingIds = new Set(current.map((topic) => topic.id));
        return [
          ...current,
          ...data.topics.filter((topic) => !existingIds.has(topic.id)),
        ];
      });
      setTopicPage(nextPage);
      setHasMoreTopics(data.hasMore === true);
    } catch (loadError) {
      console.error("Could not load more forum topics", loadError);
      setLoadMoreError("More discussions could not be loaded. Please try again.");
    } finally {
      setLoadingMoreTopics(false);
    }
  }

  async function setForumLike(
    contentType: "topic" | "reply",
    contentId: string,
    liked: boolean
  ) {
    if (!userId) return;
    const key = `${contentType}:${contentId}`;
    setPendingLikes((current) => new Set(current).add(key));
    setError("");

    try {
      const response = await fetch("/api/community/forum/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contentType, contentId, liked }),
      });
      const result: { liked?: boolean; likeCount?: number; error?: string } =
        await response.json();
      if (
        !response.ok ||
        typeof result.likeCount !== "number" ||
        typeof result.liked !== "boolean"
      ) {
        throw new Error(result.error || "Could not update like");
      }

      setTopics((current) =>
        current.map((topic) =>
          contentType === "topic" && topic.id === contentId
            ? { ...topic, liked_by_user: result.liked!, like_count: result.likeCount! }
            : {
                ...topic,
                replies: topic.replies.map((reply) =>
                  contentType === "reply" && reply.id === contentId
                    ? {
                        ...reply,
                        liked_by_user: result.liked!,
                        like_count: result.likeCount!,
                      }
                    : reply
                ),
              }
        )
      );
    } catch (likeError) {
      console.error("Could not update forum like", likeError);
      setError("Your like could not be updated. Please try again.");
    } finally {
      setPendingLikes((current) => {
        const updated = new Set(current);
        updated.delete(key);
        return updated;
      });
    }
  }

  async function toggleTopicBookmark(topic: ForumTopic) {
    if (!userId) return;
    const bookmark = !topic.bookmarked_by_user;
    setError("");
    try {
      const response = await fetch(
        bookmark
          ? "/api/community/forum/bookmarks"
          : `/api/community/forum/bookmarks?topic_id=${encodeURIComponent(topic.id)}`,
        {
          method: bookmark ? "POST" : "DELETE",
          headers: bookmark ? { "Content-Type": "application/json" } : undefined,
          body: bookmark ? JSON.stringify({ topicId: topic.id }) : undefined,
          credentials: "include",
        }
      );
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update saved discussions");
      setTopics((current) =>
        current.map((entry) =>
          entry.id === topic.id ? { ...entry, bookmarked_by_user: bookmark } : entry
        )
      );
    } catch (bookmarkError) {
      console.error("Could not update saved forum topic", bookmarkError);
      setError(
        bookmarkError instanceof Error
          ? bookmarkError.message
          : "Could not update saved discussions."
      );
    }
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        if (!threadId) {
          const params = new URLSearchParams(window.location.search);
          const legacyTopicId = params.get("topic") ??
            (window.location.hash.startsWith("#forum-topic-") ? window.location.hash.slice("#forum-topic-".length) : null);
          if (legacyTopicId) {
            window.location.replace(`${forumTopicHref(legacyTopicId)}${params.get("reply") === "1" ? "?reply=1" : ""}`);
            return;
          }
        }
        const {
          data: { session },
          error: sessionError,
        } = await supabaseBrowser.auth.getSession();
        if (sessionError) throw sessionError;
        if (active) setUserId(session?.user.id ?? null);

        if (session) {
          try {
            const [
              { data: recipes, error: recipesError },
              { data: vessels, error: vesselsError },
            ] = await Promise.all([
              supabaseBrowser
                .from("recipes")
                .select("id, name")
                .eq("user_id", session.user.id)
                .eq("is_public", true)
                .order("name"),
              supabaseBrowser
                .from("kar")
                .select("id")
                .eq("user_id", session.user.id)
                .eq("is_public", true),
            ]);
            if (recipesError || vesselsError) {
              throw recipesError || vesselsError;
            }
            const vesselIds = (vessels ?? []).map((vessel) => vessel.id);
            const { data: batches, error: batchesError } = vesselIds.length
              ? await supabaseBrowser
                  .from("batches")
                  .select("id, name, status")
                  .eq("user_id", session.user.id)
                  .in("aktivt_kar", vesselIds)
                  .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"])
              : { data: [], error: null };
            if (batchesError) throw batchesError;
            if (active) {
              setAttachmentChoices([
                ...(recipes ?? []).map((recipe) => ({
                  type: "recipe" as const,
                  id: recipe.id,
                  key: `recipe:${recipe.id}`,
                  label: `Recipe · ${recipe.name}`,
                })),
                ...(batches ?? []).map((batch) => ({
                  type: "batch" as const,
                  id: batch.id,
                  key: `batch:${batch.id}`,
                  label: `Batch · ${batch.name}`,
                })),
              ]);
            }
          } catch (attachmentError) {
            console.error("Could not load attachable recipes or batches", attachmentError);
            if (active) {
              setError(
                "The forum is available, but attachable recipes and batches could not be loaded."
              );
            }
          }
        }

        const hashPrefix = "#forum-topic-";
        const hash = window.location.hash;
        await loadTopics(
          hash.startsWith(hashPrefix) ? hash.slice(hashPrefix.length) : undefined
        );
      } catch (loadError) {
        console.error("Could not load community forum", loadError);
        if (active) setError("The forum could not be loaded. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();
    return () => {
      active = false;
    };
  }, [loadTopics, threadId]);

  useEffect(() => {
    if (loading || isMuted) return;
    const params = new URLSearchParams(window.location.search);
    const topicId = threadId ?? params.get("topic");
    if (!topicId || params.get("reply") !== "1" || openedReply.current === `${userId}:${topicId}`) return;
    if (!topics.some(topic => topic.id === topicId)) return;
    openedReply.current = `${userId}:${topicId}`;
    openReply(topicId);
  }, [loading, isMuted, topics, userId, openReply, threadId]);

  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId.startsWith("forum-topic-")) return;

    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [topics]);

  useEffect(() => {
    if (!topicModalOpen || submitting) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setTopicModalOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [topicModalOpen, submitting]);

  useEffect(() => {
    if (!communityRecipeModalOpen || submitting) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCommunityRecipeModalOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [communityRecipeModalOpen, submitting]);

  useEffect(() => {
    if (!muteModalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMuteModalOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [muteModalOpen]);

  useEffect(() => {
    if (!mute?.ends_at) {
      setMuteRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const remaining = new Date(mute.ends_at!).getTime() - Date.now();
      if (remaining <= 0) {
        setMute(null);
        setMuteModalOpen(false);
        setMuteRemaining(null);
        return;
      }
      setMuteRemaining(remaining);
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [mute?.ends_at]);

  async function createTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || submitting || isMuted) return;
    if (!body.trim() && topicImages.length === 0 && topicAttachments.length === 0) {
      setError("Write a message or attach an image, recipe, or batch.");
      return;
    }

    setSubmitting(true);
    setError("");
    let uploadedImages: ForumImage[] = [];
    let topicCreated = false;
    try {
      uploadedImages = await uploadForumImages(topicImages);
      await submitForumMutation("POST", {
        action: "create_topic",
        title: title.trim(),
        category,
        content: encodeForumContent(
            body,
            uploadedImages.map((image) => image.path),
            topicAttachments
              .map((key) => attachmentChoices.find((choice) => choice.key === key))
              .filter((choice): choice is ForumAttachmentChoice => !!choice)
              .map(({ type, id }) => ({ type, id }))
          ),
      });

      topicCreated = true;
      setTitle("");
      setBody("");
      setCategory("Brewing");
      setTopicImages([]);
      setTopicAttachments([]);
      setTopicModalOpen(false);
      await loadTopics();
    } catch (loadError) {
      console.error("Could not create forum topic or refresh the forum", loadError);
      if (!topicCreated && uploadedImages.length) {
        try {
          await cleanUpForumImages(uploadedImages);
        } catch (cleanupError) {
          console.error("Could not clean up unposted forum images", cleanupError);
        }
      }
      setError(
        topicCreated
          ? "Your topic was posted, but the forum could not refresh."
          : loadError instanceof Error
          ? loadError.message
          : "Your topic could not be posted. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function createCommunityRecipeTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || submitting || isMuted) return;
    if (!communityRecipeId) {
      setError("Choose one of your public recipes.");
      return;
    }

    setSubmitting(true);
    setError("");
    let topicCreated = false;
    try {
      await submitForumMutation("POST", {
        action: "create_topic",
        title: communityRecipeTitle.trim(),
        category: "Brewing",
        content: encodeForumContent(communityRecipeBody, [], [
          { type: "recipe", id: communityRecipeId },
        ]),
        isCommunityRecipe: true,
      });
      topicCreated = true;
      setCommunityRecipeId("");
      setCommunityRecipeTitle("");
      setCommunityRecipeBody("");
      setCommunityRecipeModalOpen(false);
      await loadTopics();
    } catch (submitError) {
      console.error("Could not create community recipe forum post", submitError);
      setError(
        topicCreated
          ? "Your community recipe was posted, but the forum could not refresh."
          : submitError instanceof Error
          ? submitError.message
          : "Your community recipe could not be posted. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function makeCommunityRecipeVersion(recipeId: string, topicId: string) {
    setForkingRecipeId(recipeId);
    setError("");
    try {
      const response = await fetch("/api/recipes/fork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipeId, topicId }),
      });
      const result: { recipeId?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not make a recipe version.");
      if (!result.recipeId) throw new Error("The recipe version was created without an id.");
      setAddedRecipeIds((current) => new Set(current).add(recipeId));
    } catch (forkError) {
      console.error("Could not make community recipe version", forkError);
      setError(
        forkError instanceof Error
          ? forkError.message
          : "Could not make a recipe version."
      );
    } finally {
      setForkingRecipeId(null);
    }
  }

  async function createReply(event: FormEvent<HTMLFormElement>, topicId: string) {
    event.preventDefault();
    if (!userId || submitting || isMuted) return;
    if (!replyBody.trim() && replyImages.length === 0 && replyAttachments.length === 0) {
      setReplyError("Write a reply or attach an image, recipe, or batch.");
      return;
    }
    if (unavailableReplyAttachments.length > 0) {
      setReplyError("Some saved attachments are no longer available. Remove them or reselect attachments before posting.");
      return;
    }

    setSubmitting(true);
    setError("");
    setReplyError("");
    saveReplyDraft(topicId, replyBody, replyAttachments, replyImages);
    let uploadedImages: ForumImage[] = [];
    let replyCreated = false;
    try {
      uploadedImages = await uploadForumImages(replyImages);
      await submitForumMutation("POST", {
        action: "create_reply",
        topicId,
        content: encodeForumContent(
            replyBody,
            uploadedImages.map((image) => image.path),
            replyAttachments
              .map((key) => attachmentChoices.find((choice) => choice.key === key))
              .filter((choice): choice is ForumAttachmentChoice => !!choice)
              .map(({ type, id }) => ({ type, id }))
          ),
      });

      replyCreated = true;
      try {
        localStorage.removeItem(forumDraftKey(topicId, userId));
        localStorage.removeItem(forumDraftKey(topicId, null));
      } catch (storageError) {
        console.error("Could not clear posted forum reply draft", storageError);
        setError("Your reply was posted, but its local draft could not be removed.");
      }
      setReplyBody("");
      setReplyImages([]);
      setReplyAttachments([]);
      setReplyingTo(null);
      await loadTopics(topicId);
    } catch (loadError) {
      console.error("Could not create forum reply or refresh the forum", loadError);
      if (!replyCreated && uploadedImages.length) {
        try {
          await cleanUpForumImages(uploadedImages);
        } catch (cleanupError) {
          console.error("Could not clean up unposted forum images", cleanupError);
        }
      }
      if (loadError instanceof ForumSignInRequiredError) setReplyNeedsSignIn(true);
      if (replyCreated) setError("Your reply was posted, but the forum could not refresh.");
      else setReplyError(loadError instanceof Error
        ? loadError.message
        : "Your reply could not be posted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditingTopic(topic: ForumTopic) {
    setEditingReply(null);
    setEditingTopic(topic.id);
    setEditBody(topic.body);
  }

  function startEditingReply(reply: ForumReply) {
    setEditingTopic(null);
    setEditingReply(reply.id);
    setEditBody(reply.body);
  }

  async function saveTopicEdit(event: FormEvent<HTMLFormElement>, topicId: string) {
    event.preventDefault();
    if (!userId || submitting) return;

    setSubmitting(true);
    setError("");
    const topic = topics.find((item) => item.id === topicId);
    try {
      await submitForumMutation("PATCH", {
        type: "topic",
        id: topicId,
        content: encodeForumContent(
          editBody,
          topic?.images.map((image) => image.path) ?? [],
          topic?.attachments.map(({ type, id }) => ({ type, id })) ?? []
        ),
      });
    } catch (updateError) {
      console.error("Could not edit forum topic", updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The discussion could not be updated. Please try again."
      );
      setSubmitting(false);
      return;
    }

    setEditingTopic(null);
    try {
      await loadTopics();
    } catch (loadError) {
      console.error("Discussion updated but forum refresh failed", loadError);
      setError("The discussion was updated, but the forum could not refresh.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveReplyEdit(event: FormEvent<HTMLFormElement>, reply: ForumReply) {
    event.preventDefault();
    if (!userId || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      await submitForumMutation("PATCH", {
        type: "reply",
        id: reply.id,
        content: encodeForumContent(
          editBody,
          reply.images.map((image) => image.path),
          reply.attachments.map(({ type, id }) => ({ type, id }))
        ),
      });
    } catch (updateError) {
      console.error("Could not edit forum reply", updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The reply could not be updated. Please try again."
      );
      setSubmitting(false);
      return;
    }

    setEditingReply(null);
    try {
      await loadTopics();
    } catch (loadError) {
      console.error("Reply updated but forum refresh failed", loadError);
      setError("The reply was updated, but the forum could not refresh.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!userId || !pendingDelete || submitting) return false;
    setSubmitting(true);
    setError("");
    try {
      const isTopic = pendingDelete.type === "topic";
      const targetId = isTopic
        ? pendingDelete.topic.id
        : pendingDelete.reply.id;
      if (canModerate) {
        const response = await fetch("/api/community/forum/moderation", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            contentType: isTopic ? "topic" : "reply",
            contentId: targetId,
          }),
        });
        const result: { error?: string } = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not remove forum content");
        }
      } else {
        await submitForumMutation("DELETE", {
          type: isTopic ? "topic" : "reply",
          id: targetId,
        });
      }

      try {
        await loadTopics();
      } catch (loadError) {
        console.error("Forum content deleted but refresh failed", loadError);
        setError("The content was deleted, but the forum could not refresh.");
      }
      return true;
    } catch (deleteError) {
      console.error("Could not delete forum content", deleteError);
      setError("The content could not be deleted. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="relative w-full max-w-3xl rounded-xl border border-white/10 bg-black/60 p-6 backdrop-blur-md sm:p-8">
        <PublicPageNavigation current="forum" />

        {!threadId && <>
        <PageHeading
          title="Community forum"
          subtitle="Ask questions, share what you’ve learned, and talk brewing with the community."
        />

        <section
          aria-labelledby="forum-welcome-title"
          className="mb-8 rounded-xl border border-white/10 bg-white/5 p-5 sm:p-6"
        >
          <h2 id="forum-welcome-title" className="mb-3 text-xl font-semibold text-green-300">
            Welcome to the Batchlogg Forums!
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-white/80">
            <p>Welcome to the heart of the Batchlogg community!</p>
            <p>
              This forum is the place where brewers of all levels can come together to share experiences, ask questions, showcase their batches, and learn from one another.
            </p>
            <p>Batchlogg is built on structure, control, and creativity — and this forum is an extension of that philosophy. Here you can:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Discuss recipes, techniques, and ingredients</li>
              <li>Get help when a batch behaves… unexpectedly</li>
              <li>Share photos, tasting notes, and results</li>
              <li>Follow what other brewers are creating</li>
              <li>Build a community where everyone can grow as brewers</li>
            </ul>
            <p>
              Whether you brew mead, beer, cider, hard seltzer, or something entirely your own, you’re welcome here.
              This forum is made for brewers, by brewers — and we’re excited to see what you create.
            </p>
            <p>
              Raise a glass, share your knowledge, and let’s build an amazing brewing community together.
            </p>
          </div>
        </section>

        {userId && !isMuted ? (
          <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setError("");
                setTopicModalOpen(true);
              }}
              disabled={loading}
              className="rounded-lg border border-green-500 bg-green-700 px-5 py-3 font-semibold hover:bg-green-600 disabled:cursor-wait disabled:opacity-50"
            >
              Start a discussion
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setCommunityRecipeModalOpen(true);
              }}
              disabled={loading}
              className="rounded-lg border border-green-400/40 bg-green-500/10 px-5 py-3 font-semibold text-green-100 hover:bg-green-500/20 disabled:cursor-wait disabled:opacity-50"
            >
              Start a community recipe
            </button>
          </div>
        ) : !userId ? (
          <p className="mb-8 rounded-lg border border-white/10 bg-white/5 p-4 text-center text-white/70">
            <Link href="/auth/login" className="text-green-300 underline">
              Sign in
            </Link>{" "}
            to start a discussion or reply.
          </p>
        ) : null}
        </>}

        {error && !topicModalOpen && (
          <p role="alert" className="mb-6 text-center text-amber-300">
            {error}
          </p>
        )}

        <section aria-label={threadId ? "Discussion thread" : "Forum discussions"} className="space-y-5">
          {!threadId && <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span>Search discussions</span>
              <input
                type="search"
                value={topicSearch}
                onChange={(event) => setTopicSearch(event.target.value)}
                placeholder="Search titles, posts, and replies"
                className="rounded-lg border border-white/20 bg-black/40 p-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Filter category</span>
              <select
                value={selectedCategory}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedCategory(
                    value === "All categories" || isForumCategory(value)
                      ? value
                      : "All categories"
                  );
                }}
                className="rounded-lg border border-white/20 bg-black/40 p-2"
              >
                <option>All categories</option>
                {FORUM_CATEGORIES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Sort discussions</span>
              <select
                value={topicSort}
                onChange={(event) =>
                  setTopicSort(
                    event.target.value as "newest" | "oldest" | "popular" | "active"
                  )
                }
                className="rounded-lg border border-white/20 bg-black/40 p-2"
              >
                <option value="newest">Newest</option>
                <option value="active">Recently active</option>
                <option value="popular">Most liked</option>
                <option value="oldest">Oldest</option>
              </select>
            </label>
            {userId && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setSavedOnly((current) => !current)}
                  aria-pressed={savedOnly}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    savedOnly
                      ? "border-green-500 bg-green-700"
                      : "border-white/20 bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {savedOnly ? "Showing saved only" : "Show saved only"}
                </button>
              </div>
            )}
          </div>}
          {!threadId && !loading && (
            <div className="space-y-2 text-sm text-white/60">
              <p role="status" aria-live="polite">
                {visibleTopics.length} {visibleTopics.length === 1 ? "discussion" : "discussions"} shown · {topics.length} loaded
                {hasMoreTopics ? " · More available" : ""}
              </p>
              {hasMoreTopics && <p>Search, category, saved, and sort controls apply to loaded discussions. Load more to include older discussions.</p>}
              {linkedTopicId && <a href="/community/forum" className="inline-block min-h-11 py-2 text-green-200 underline">Browse all discussions</a>}
            </div>
          )}
          {loading ? (
            <p className="py-8 text-center text-white/60">{threadId ? "Loading discussion…" : "Loading discussions…"}</p>
          ) : visibleTopics.length === 0 ? (
            <p className="py-8 text-center text-white/60">
              {linkedTopicId && topics.length === 0
                ? "This discussion is unavailable or has been removed."
                : topics.length === 0
                ? "No discussions yet. Start the first one!"
                : savedOnly
                  ? "No saved discussions match these filters."
                  : "No discussions match these filters."}
            </p>
          ) : (
            visibleTopics.map((topic) => (
              <article
                key={topic.id}
                id={`forum-topic-${topic.id}`}
                className="scroll-mt-6 rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {editingTopic === topic.id ? (
                    <form
                      onSubmit={(event) => saveTopicEdit(event, topic.id)}
                      className="w-full space-y-3"
                    >
                      <label
                        htmlFor={`edit-topic-body-${topic.id}`}
                        className="block text-sm font-medium"
                      >
                        Message
                      </label>
                      <PublicMentionTextarea
                        id={`edit-topic-body-${topic.id}`}
                        value={editBody}
                        onChange={setEditBody}
                        showReadableMentions
                        maxLength={5000}
                        rows={4}
                        className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
                      />
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={submitting || isMuted}
                          className="rounded-lg border border-green-500 bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submitting ? "Saving…" : "Save changes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTopic(null)}
                          disabled={submitting}
                          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <span className="inline-block rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white/70">
                          {topic.category}
                        </span>
                        {topic.is_community_recipe && (
                          <span className="ml-2 inline-block rounded-full border border-green-300/30 bg-green-300/10 px-2.5 py-1 text-xs font-semibold text-green-100">
                            Community recipe
                          </span>
                        )}
                        {userId ? (
                          <button
                            type="button"
                            onClick={() => void toggleTopicBookmark(topic)}
                            aria-pressed={topic.bookmarked_by_user}
                            className="ml-2 rounded-lg border border-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/10"
                          >
                            {topic.bookmarked_by_user ? "Saved" : "Save"}
                          </button>
                        ) : (
                          <Link
                            href="/auth/login"
                            className="ml-2 text-xs text-green-300 underline"
                          >
                            Sign in to save
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => void copyTopicLink(topic.id)}
                          aria-label={copiedTopicId === topic.id ? "Link copied" : "Share discussion"}
                          title={copiedTopicId === topic.id ? "Link copied" : "Copy discussion link"}
                          className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-lg align-middle text-white/65 hover:bg-white/10 hover:text-white"
                        >
                          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            {copiedTopicId === topic.id ? (
                              <path d="m5 12 4 4L19 6" />
                            ) : (
                              <>
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
                              </>
                            )}
                          </svg>
                          <span className="sr-only" role="status">
                            {copiedTopicId === topic.id ? "Discussion link copied." : ""}
                          </span>
                        </button>
                        {threadId ? <h1 className="mt-2 text-2xl font-bold text-green-300">{topic.title}</h1> : <h2 className="mt-2 text-xl font-bold text-green-300">
                          <a href={forumTopicHref(topic.id)} className="hover:underline">{topic.title}</a>
                        </h2>}
                      </div>
                      {(userId === topic.author_id || canModerate) && (
                        <div className="flex gap-2">
                          {userId === topic.author_id && (
                            <button
                              type="button"
                              onClick={() => startEditingTopic(topic)}
                              disabled={submitting}
                              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
                            >
                              Edit discussion
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingDelete({ type: "topic", topic })}
                            disabled={submitting}
                            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
                          >
                            {userId === topic.author_id ? "Delete discussion" : "Remove discussion"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {editingTopic !== topic.id && (
                  <div className="mt-3">
                    {topic.body && (
                      <p className="whitespace-pre-wrap">
                        <PublicMentionText text={topic.body} />
                      </p>
                    )}
                    <ForumImages images={topic.images} />
                    <ForumAttachmentCards
                      attachments={topic.attachments}
                      communityTopicId={
                        userId && topic.is_community_recipe && !isMuted
                          ? topic.id
                          : undefined
                      }
                      forkingRecipeId={forkingRecipeId}
                      addedRecipeIds={addedRecipeIds}
                      onMakeVersion={makeCommunityRecipeVersion}
                    />
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-sm text-white/50">
                    <AuthorLink author={topic.author} /> · {formatDate(topic.created_at)}
                    {new Date(topic.updated_at).getTime() >
                      new Date(topic.created_at).getTime() && (
                      <span className="ml-2 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-white/70">
                        Edited
                      </span>
                    )}
                  </p>
                  <ForumLikeButton
                    contentId={topic.id}
                    contentType="topic"
                    count={topic.like_count}
                    liked={topic.liked_by_user}
                    userId={userId}
                    pending={pendingLikes.has(`topic:${topic.id}`)}
                    onToggle={setForumLike}
                  />
                </div>
                {userId && userId !== topic.author_id && (
                  <ReportContentButton
                    contentType="post"
                    contentId={topic.id}
                    contextUrl={forumTopicHref(topic.id)}
                  />
                )}

                {topic.replies.length > 0 && (
                  <div className="mt-5 space-y-3 border-l border-white/15 pl-4">
                    {topic.replies.map((reply) => (
                      <div key={reply.id} className="rounded-lg bg-black/20 p-3">
                        {editingReply === reply.id ? (
                          <form
                            onSubmit={(event) => saveReplyEdit(event, reply)}
                            className="space-y-3"
                          >
                            <PublicMentionTextarea
                              value={editBody}
                              onChange={setEditBody}
                              showReadableMentions
                              maxLength={2000}
                              rows={3}
                              aria-label="Edit reply"
                              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
                            />
                            <div className="flex gap-3">
                              <button
                                type="submit"
                                disabled={submitting}
                                className="rounded-lg border border-green-500 bg-green-700 px-3 py-2 text-sm font-semibold hover:bg-green-600 disabled:opacity-60"
                              >
                                {submitting ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingReply(null)}
                                disabled={submitting}
                                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              {reply.body && (
                                <p className="whitespace-pre-wrap">
                                  <PublicMentionText text={reply.body} />
                                </p>
                              )}
                              <ForumImages images={reply.images} />
                              <ForumAttachmentCards attachments={reply.attachments} />
                            </div>
                            {(userId === reply.author_id || canModerate) && (
                              <div className="flex shrink-0 gap-3">
                                {userId === reply.author_id && (
                                  <button
                                    type="button"
                                    onClick={() => startEditingReply(reply)}
                                    disabled={submitting}
                                    className="text-xs text-white/60 underline hover:text-white disabled:opacity-50"
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setPendingDelete({ type: "reply", reply })}
                                  disabled={submitting}
                                  className="text-xs text-white/60 underline hover:text-white disabled:opacity-50"
                                >
                                  {userId === reply.author_id ? "Delete" : "Remove"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <p className="text-xs text-white/50">
                            <AuthorLink author={reply.author} /> · {formatDate(reply.created_at)}
                            {new Date(reply.updated_at).getTime() >
                              new Date(reply.created_at).getTime() && (
                              <span className="ml-2 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-white/70">
                                Edited
                              </span>
                            )}
                          </p>
                          <ForumLikeButton
                            contentId={reply.id}
                            contentType="reply"
                            count={reply.like_count}
                            liked={reply.liked_by_user}
                            userId={userId}
                            pending={pendingLikes.has(`reply:${reply.id}`)}
                            onToggle={setForumLike}
                          />
                        </div>
                        {userId && userId !== reply.author_id && (
                          <ReportContentButton
                            contentType="reply"
                            contentId={reply.id}
                            contextUrl={forumTopicHref(topic.id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!isMuted && (
                  <div className="mt-4">
                    {replyingTo === topic.id ? (
                      <form
                        onSubmit={(event) => createReply(event, topic.id)}
                        className="space-y-3"
                      >
                        <PublicMentionTextarea
                          value={replyBody}
                          onChange={(value) => {
                            setReplyBody(value);
                            saveReplyDraft(topic.id, value, replyAttachments, replyImages);
                          }}
                          showReadableMentions
                          maxLength={2000}
                          rows={3}
                          placeholder="Write a reply…"
                          aria-label={`Reply to ${topic.title}`}
                          className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
                        />
                        {userId && !replyNeedsSignIn && <ForumImagePicker
                          files={replyImages}
                          onChange={files => {
                            setReplyImages(files);
                            saveReplyDraft(topic.id, replyBody, replyAttachments, files);
                          }}
                          setError={setError}
                          disabled={submitting}
                        />}
                        {draftMessage && <p role="status" className="text-xs text-white/60">{draftMessage}</p>}
                        {userId && !replyNeedsSignIn && unavailableReplyAttachments.length > 0 && (
                          <p className="text-sm text-amber-200">
                            Some saved attachments are no longer available.{" "}
                            <button
                              type="button"
                              disabled={submitting}
                              className="underline disabled:opacity-50"
                              onClick={() => {
                                const attachments = replyAttachments.filter(key => !unavailableReplyAttachments.includes(key));
                                setReplyAttachments(attachments);
                                saveReplyDraft(topic.id, replyBody, attachments, replyImages);
                              }}
                            >Remove unavailable attachments</button>
                          </p>
                        )}
                        {replyError && <p role="alert" className="text-sm text-amber-200">{replyError}</p>}
                        <div className="flex flex-wrap gap-3">
                          {userId && !replyNeedsSignIn ? <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg border border-green-500 bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600 disabled:cursor-wait disabled:opacity-60"
                          >
                            {submitting ? "Posting…" : "Post reply"}
                          </button> : <Link
                            href={`/auth/login?redirect=${encodeURIComponent(`${forumTopicHref(topic.id)}?reply=1`)}`}
                            onClick={() => saveReplyDraft(topic.id, replyBody, replyAttachments, replyImages)}
                            className="rounded-lg border border-green-500 bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600"
                          >Sign in to post reply</Link>}
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyBody("");
                              setReplyImages([]);
                              setReplyAttachments([]);
                            }}
                            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                          >
                            Close (keep draft)
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              try {
                                localStorage.removeItem(forumDraftKey(topic.id, userId));
                                localStorage.removeItem(forumDraftKey(topic.id, null));
                                setReplyBody("");
                                setReplyImages([]);
                                setReplyAttachments([]);
                                setDraftMessage("Draft discarded.");
                                setReplyError("");
                              } catch (storageError) {
                                console.error("Could not discard forum reply draft", storageError);
                                setReplyError("The saved draft could not be removed. Please try again.");
                              }
                            }}
                            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/65 hover:bg-white/10"
                          >Discard draft</button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          openReply(topic.id);
                        }}
                        className="text-sm font-semibold text-green-300 hover:text-green-200 disabled:cursor-wait disabled:opacity-50"
                      >
                        {userId ? "Reply" : "Write a reply"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
          {!loading && hasMoreTopics && (
            <div className="space-y-2 pt-2 text-center">
              {loadMoreError && <p role="alert" className="text-sm text-amber-200">{loadMoreError}</p>}
              <button
                type="button"
                onClick={() => void loadMoreTopics()}
                disabled={loadingMoreTopics}
                className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
              >
                {loadingMoreTopics ? "Loading…" : "Load more discussions"}
              </button>
            </div>
          )}
        </section>
      </div>
      {mute && muteModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMuteModalOpen(false);
          }}
        >
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="forum-mute-title"
            className="relative z-10 w-full max-w-lg rounded-2xl border border-amber-400/30 bg-zinc-900 p-6 text-white shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setMuteModalOpen(false)}
              aria-label="Close mute notice"
              className="absolute right-4 top-4 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
            <h2 id="forum-mute-title" className="text-2xl font-bold text-amber-300">
              You are muted
            </h2>
            <p className="mt-3 text-white/80">
              You cannot start discussions or reply while this mute is active.
            </p>
            {mute.reason && (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-center text-white/75">
                <p className="font-semibold text-white">Reason:</p>
                <p className="mt-1 whitespace-pre-wrap">{mute.reason}</p>
              </div>
            )}
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              {mute.ends_at ? (
                <>
                  <p>
                    Mute lifts:{" "}
                    <time dateTime={mute.ends_at}>
                      {new Date(mute.ends_at).toLocaleString("en-GB")}
                    </time>
                  </p>
                  {muteRemaining !== null && (
                    <p className="mt-2 font-semibold" aria-live="off">
                      Time remaining: {formatCountdown(muteRemaining)}
                    </p>
                  )}
                </>
              ) : (
                <p>Duration: Indefinite</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setMuteModalOpen(false)}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
      {topicModalOpen && !isMuted && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setTopicModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="forum-topic-dialog-title"
            className="relative w-full max-w-xl rounded-xl border border-white/15 bg-zinc-900 p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setTopicModalOpen(false)}
              disabled={submitting}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              ✕
            </button>
            <h2 id="forum-topic-dialog-title" className="mb-5 text-2xl font-semibold">
              Start a discussion
            </h2>
            {error && (
              <p role="alert" className="mb-4 text-sm text-amber-300">
                {error}
              </p>
            )}
            <form onSubmit={createTopic} className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="forum-title">
                Title
              </label>
              <input
                id="forum-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={3}
                maxLength={150}
                required
                placeholder="What would you like to discuss?"
                className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
              />
              <label className="block text-sm font-medium" htmlFor="forum-category">
                Category
              </label>
              <select
                id="forum-category"
                value={category}
                onChange={(event) => {
                  if (isForumCategory(event.target.value)) {
                    setCategory(event.target.value);
                  }
                }}
                className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
              >
                {FORUM_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <label className="block text-sm font-medium" htmlFor="forum-body">
                Message
              </label>
              <PublicMentionTextarea
                id="forum-body"
                value={body}
                onChange={setBody}
                showReadableMentions
                maxLength={5000}
                rows={5}
                placeholder="Share some details…"
                className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
              />
              <ForumImagePicker
                files={topicImages}
                onChange={setTopicImages}
                setError={setError}
                disabled={submitting}
              />
              <ForumAttachmentPicker
                choices={attachmentChoices}
                value={topicAttachments}
                onChange={setTopicAttachments}
                disabled={submitting}
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTopicModalOpen(false)}
                  disabled={submitting}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg border border-green-500 bg-green-700 px-4 py-2 font-semibold hover:bg-green-600 disabled:cursor-wait disabled:opacity-60"
                >
                  {submitting ? "Posting…" : "Post discussion"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {communityRecipeModalOpen && !isMuted && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setCommunityRecipeModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-recipe-dialog-title"
            className="relative w-full max-w-xl rounded-xl border border-white/15 bg-zinc-900 p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setCommunityRecipeModalOpen(false)}
              disabled={submitting}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              ✕
            </button>
            <h2
              id="community-recipe-dialog-title"
              className="mb-2 text-2xl font-semibold text-green-300"
            >
              Start a community recipe
            </h2>
            <p className="mb-5 text-sm leading-relaxed text-white/65">
              Share one of your public recipes as a forum post. Other brewers can
              make their own private, independent version from that post.
              Your profile must also be public.
            </p>
            {error && (
              <p role="alert" className="mb-4 text-sm text-amber-300">
                {error}
              </p>
            )}
            <form onSubmit={createCommunityRecipeTopic} className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="community-recipe-select">
                Public recipe
              </label>
              <select
                id="community-recipe-select"
                value={communityRecipeId}
                onChange={(event) => {
                  const selectedId = event.target.value;
                  setCommunityRecipeId(selectedId);
                  const recipe = attachmentChoices.find(
                    (choice) => choice.type === "recipe" && choice.id === selectedId
                  );
                  if (recipe) {
                    setCommunityRecipeTitle(
                      `Community recipe: ${recipe.label.replace(/^Recipe · /, "")}`
                    );
                  }
                }}
                required
                disabled={submitting || !attachmentChoices.some((choice) => choice.type === "recipe")}
                className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
              >
                <option value="">
                  {attachmentChoices.some((choice) => choice.type === "recipe")
                    ? "Choose a public recipe"
                    : "No public recipes available"}
                </option>
                {attachmentChoices
                  .filter((choice) => choice.type === "recipe")
                  .map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.label.replace(/^Recipe · /, "")}
                    </option>
                  ))}
              </select>
              {!attachmentChoices.some((choice) => choice.type === "recipe") && (
                <p className="text-sm text-white/60">
                  Make a recipe public in{" "}
                  <Link href="/my-recipes" className="text-green-300 underline">
                    My recipes
                  </Link>{" "}
                  first.
                </p>
              )}
              <label className="block text-sm font-medium" htmlFor="community-recipe-title">
                Forum post title
              </label>
              <input
                id="community-recipe-title"
                value={communityRecipeTitle}
                onChange={(event) => setCommunityRecipeTitle(event.target.value)}
                minLength={3}
                maxLength={150}
                required
                placeholder="Name your community recipe"
                className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
              />
              <label className="block text-sm font-medium" htmlFor="community-recipe-message">
                Message (optional)
              </label>
              <PublicMentionTextarea
                id="community-recipe-message"
                value={communityRecipeBody}
                onChange={setCommunityRecipeBody}
                showReadableMentions
                maxLength={5000}
                rows={4}
                placeholder="Tell the community what makes this recipe special…"
                className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCommunityRecipeModalOpen(false)}
                  disabled={submitting}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !attachmentChoices.some((choice) => choice.type === "recipe")
                  }
                  className="rounded-lg border border-green-500 bg-green-700 px-4 py-2 font-semibold hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Posting…" : "Post community recipe"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete?.type === "topic"
            ? "Delete this discussion?"
            : "Delete this reply?"
        }
        message={
          pendingDelete?.type === "topic"
            ? pendingDelete.topic.author_id !== userId
              ? "As a moderator, you are about to permanently remove this discussion and all of its replies."
              : "This will also permanently delete all replies to the discussion."
            : pendingDelete?.type === "reply" && pendingDelete.reply.author_id !== userId
              ? "As a moderator, you are about to permanently remove this reply."
              : "This reply will be permanently deleted."
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}
