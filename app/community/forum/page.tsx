"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MenuOverlay from "@/app/components/MenuOverlay";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import PageHeading from "@/app/components/PageHeading";
import BackButton from "@/app/members/BackButton";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import ReportContentButton from "@/app/components/ReportContentButton";
import {
  encodeForumContent,
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
      <img
        src={author.avatar_url || "/default-avatar.png"}
        alt=""
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
  created_at: string;
  updated_at: string;
  author: ForumAuthor;
  images: ForumImage[];
  attachments: ForumAttachment[];
  replies: ForumReply[];
}

interface ForumAttachmentChoice extends ForumAttachmentRef {
  key: string;
  label: string;
}

const FORUM_CATEGORIES = [
  "Brewing",
  "Equipment",
  "Ingredients",
  "Troubleshooting",
  "Off-topic",
] as const;
const ACCEPTED_FORUM_IMAGE_TYPES = new Set<string>(FORUM_IMAGE_TYPES);

type ForumCategory = (typeof FORUM_CATEGORIES)[number];

type PendingDelete =
  | { type: "topic"; topic: ForumTopic }
  | { type: "reply"; reply: ForumReply };

function isForumCategory(value: string): value is ForumCategory {
  return FORUM_CATEGORIES.some((category) => category === value);
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
          <img
            src={image.url}
            alt="Image attached to forum post"
            loading="lazy"
            className="max-h-96 w-full object-contain"
          />
        </a>
      ))}
    </div>
  );
}

function ForumAttachmentCards({ attachments }: { attachments: ForumAttachment[] }) {
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
        return attachment.url ? (
          <a
            key={`${attachment.type}:${attachment.id}`}
            href={attachment.url}
            className="rounded-lg transition hover:border-green-400/30 hover:bg-white/5"
          >
            {card}
          </a>
        ) : (
          <div key={`${attachment.type}:${attachment.id}`}>{card}</div>
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

export default function CommunityForumPage() {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    ForumCategory | "All categories"
  >("All categories");
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
  const visibleTopics =
    selectedCategory === "All categories"
      ? topics
      : topics.filter((topic) => topic.category === selectedCategory);

  const loadTopics = useCallback(async () => {
    const response = await fetch("/api/community/forum", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Forum request failed (${response.status})`);
    }

    const data: { topics: ForumTopic[] } = await response.json();
    setTopics(data.topics);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
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
                  .in("status", ["Aktiv", "Sekundær", "secondary"])
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

        await loadTopics();
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
  }, [loadTopics]);

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

  async function createTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || submitting) return;
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
      const { error: insertError } = await supabaseBrowser
        .from("forum_topics")
        .insert({
          author_id: userId,
          title: title.trim(),
          body: encodeForumContent(
            body,
            uploadedImages.map((image) => image.path),
            topicAttachments
              .map((key) => attachmentChoices.find((choice) => choice.key === key))
              .filter((choice): choice is ForumAttachmentChoice => !!choice)
              .map(({ type, id }) => ({ type, id }))
          ),
          category,
        });

      if (insertError) {
        console.error("Could not create forum topic", insertError);
        setError("Your topic could not be posted. Please try again.");
        try {
          await cleanUpForumImages(uploadedImages);
        } catch (cleanupError) {
          console.error("Could not clean up unposted forum images", cleanupError);
        }
        return;
      }

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

  async function createReply(event: FormEvent<HTMLFormElement>, topicId: string) {
    event.preventDefault();
    if (!userId || submitting) return;
    if (!replyBody.trim() && replyImages.length === 0 && replyAttachments.length === 0) {
      setError("Write a reply or attach an image, recipe, or batch.");
      return;
    }

    setSubmitting(true);
    setError("");
    let uploadedImages: ForumImage[] = [];
    let replyCreated = false;
    try {
      uploadedImages = await uploadForumImages(replyImages);
      const { error: insertError } = await supabaseBrowser
        .from("forum_replies")
        .insert({
          topic_id: topicId,
          author_id: userId,
          body: encodeForumContent(
            replyBody,
            uploadedImages.map((image) => image.path),
            replyAttachments
              .map((key) => attachmentChoices.find((choice) => choice.key === key))
              .filter((choice): choice is ForumAttachmentChoice => !!choice)
              .map(({ type, id }) => ({ type, id }))
          ),
        });

      if (insertError) {
        console.error("Could not create forum reply", insertError);
        setError("Your reply could not be posted. Please try again.");
        try {
          await cleanUpForumImages(uploadedImages);
        } catch (cleanupError) {
          console.error("Could not clean up unposted forum images", cleanupError);
        }
        return;
      }

      replyCreated = true;
      setReplyBody("");
      setReplyImages([]);
      setReplyAttachments([]);
      setReplyingTo(null);
      await loadTopics();
    } catch (loadError) {
      console.error("Could not create forum reply or refresh the forum", loadError);
      if (!replyCreated && uploadedImages.length) {
        try {
          await cleanUpForumImages(uploadedImages);
        } catch (cleanupError) {
          console.error("Could not clean up unposted forum images", cleanupError);
        }
      }
      setError(
        replyCreated
          ? "Your reply was posted, but the forum could not refresh."
          : loadError instanceof Error
          ? loadError.message
          : "Your reply could not be posted. Please try again."
      );
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
    const { data, error: updateError } = await supabaseBrowser
      .from("forum_topics")
      .update({
        body: encodeForumContent(
          editBody,
          topic?.images.map((image) => image.path) ?? [],
          topic?.attachments.map(({ type, id }) => ({ type, id })) ?? []
        ),
      })
      .eq("id", topicId)
      .eq("author_id", userId)
      .select("id");

    if (updateError || !data?.length) {
      console.error("Could not edit forum topic", updateError);
      setError("The discussion could not be updated. Please try again.");
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
    const { data, error: updateError } = await supabaseBrowser
      .from("forum_replies")
      .update({
        body: encodeForumContent(
          editBody,
          reply.images.map((image) => image.path),
          reply.attachments.map(({ type, id }) => ({ type, id }))
        ),
      })
      .eq("id", reply.id)
      .eq("author_id", userId)
      .select("id");

    if (updateError || !data?.length) {
      console.error("Could not edit forum reply", updateError);
      setError("The reply could not be updated. Please try again.");
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
      const result = isTopic
        ? await supabaseBrowser
            .from("forum_topics")
            .delete()
            .eq("id", targetId)
            .eq("author_id", userId)
            .select("id")
        : await supabaseBrowser
            .from("forum_replies")
            .delete()
            .eq("id", targetId)
            .eq("author_id", userId)
            .select("id");

      if (result.error || !result.data?.length) {
        throw result.error ?? new Error("No matching forum content was deleted");
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
      <div className="relative w-full max-w-3xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute right-4 top-4 z-40">
          <MenuOverlay current="forum" />
        </div>
        <div className="absolute left-4 top-4 z-40">
          <BackButton />
        </div>

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

        {userId ? (
          <div className="mb-8 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setError("");
                setTopicModalOpen(true);
              }}
              className="rounded-lg border border-green-500 bg-green-700 px-5 py-3 font-semibold hover:bg-green-600"
            >
              Start a discussion
            </button>
          </div>
        ) : (
          <p className="mb-8 rounded-lg border border-white/10 bg-white/5 p-4 text-center text-white/70">
            <Link href="/auth/login" className="text-green-300 underline">
              Sign in
            </Link>{" "}
            to start a discussion or reply.
          </p>
        )}

        {error && !topicModalOpen && (
          <p role="alert" className="mb-6 text-center text-amber-300">
            {error}
          </p>
        )}

        <section aria-label="Forum discussions" className="space-y-5">
          <label className="flex items-center justify-end gap-3 text-sm">
            Filter category
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
          {loading ? (
            <p className="py-8 text-center text-white/60">Loading discussions…</p>
          ) : visibleTopics.length === 0 ? (
            <p className="py-8 text-center text-white/60">
              {topics.length === 0
                ? "No discussions yet. Start the first one!"
                : "No discussions in this category yet."}
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
                      <textarea
                        id={`edit-topic-body-${topic.id}`}
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        maxLength={5000}
                        rows={4}
                        className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
                      />
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="rounded-lg border border-green-500 bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600 disabled:opacity-60"
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
                        <h2 className="mt-2 text-xl font-bold text-green-300">
                          {topic.title}
                        </h2>
                      </div>
                      {userId === topic.author_id && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingTopic(topic)}
                            disabled={submitting}
                            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
                          >
                            Edit discussion
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete({ type: "topic", topic })}
                            disabled={submitting}
                            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
                          >
                            Delete discussion
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {editingTopic !== topic.id && (
                  <div className="mt-3">
                    {topic.body && <p className="whitespace-pre-wrap">{topic.body}</p>}
                    <ForumImages images={topic.images} />
                    <ForumAttachmentCards attachments={topic.attachments} />
                  </div>
                )}
                <p className="mt-3 text-sm text-white/50">
                  <AuthorLink author={topic.author} /> · {formatDate(topic.created_at)}
                  {new Date(topic.updated_at).getTime() >
                    new Date(topic.created_at).getTime() && (
                    <span className="ml-2 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-white/70">
                      Edited
                    </span>
                  )}
                </p>
                {userId && userId !== topic.author_id && (
                  <ReportContentButton
                    contentType="post"
                    contentId={topic.id}
                    contextUrl={`/community/forum#forum-topic-${topic.id}`}
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
                            <textarea
                              value={editBody}
                              onChange={(event) => setEditBody(event.target.value)}
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
                              {reply.body && <p className="whitespace-pre-wrap">{reply.body}</p>}
                              <ForumImages images={reply.images} />
                              <ForumAttachmentCards attachments={reply.attachments} />
                            </div>
                            {userId === reply.author_id && (
                              <div className="flex shrink-0 gap-3">
                                <button
                                  type="button"
                                  onClick={() => startEditingReply(reply)}
                                  disabled={submitting}
                                  className="text-xs text-white/60 underline hover:text-white disabled:opacity-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDelete({ type: "reply", reply })}
                                  disabled={submitting}
                                  className="text-xs text-white/60 underline hover:text-white disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="mt-2 text-xs text-white/50">
                          <AuthorLink author={reply.author} /> · {formatDate(reply.created_at)}
                          {new Date(reply.updated_at).getTime() >
                            new Date(reply.created_at).getTime() && (
                            <span className="ml-2 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-white/70">
                              Edited
                            </span>
                          )}
                        </p>
                        {userId && userId !== reply.author_id && (
                          <ReportContentButton
                            contentType="reply"
                            contentId={reply.id}
                            contextUrl={`/community/forum#forum-topic-${topic.id}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {userId && (
                  <div className="mt-4">
                    {replyingTo === topic.id ? (
                      <form
                        onSubmit={(event) => createReply(event, topic.id)}
                        className="space-y-3"
                      >
                        <textarea
                          value={replyBody}
                          onChange={(event) => setReplyBody(event.target.value)}
                          maxLength={2000}
                          rows={3}
                          placeholder="Write a reply…"
                          aria-label={`Reply to ${topic.title}`}
                          className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
                        />
                        <ForumImagePicker
                          files={replyImages}
                          onChange={setReplyImages}
                          setError={setError}
                          disabled={submitting}
                        />
                        <ForumAttachmentPicker
                          choices={attachmentChoices}
                          value={replyAttachments}
                          onChange={setReplyAttachments}
                          disabled={submitting}
                        />
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg border border-green-500 bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600 disabled:opacity-60"
                          >
                            {submitting ? "Posting…" : "Post reply"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyBody("");
                              setReplyImages([]);
                              setReplyAttachments([]);
                            }}
                            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(topic.id);
                          setReplyBody("");
                        }}
                        className="text-sm font-semibold text-green-300 hover:text-green-200"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      </div>
      {topicModalOpen && (
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
              <textarea
                id="forum-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
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
      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete?.type === "topic"
            ? "Delete this discussion?"
            : "Delete this reply?"
        }
        message={
          pendingDelete?.type === "topic"
            ? "This will also permanently delete all replies to the discussion."
            : "This reply will be permanently deleted."
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}
