"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MenuOverlay from "@/app/components/MenuOverlay";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import PageHeading from "@/app/components/PageHeading";
import BackButton from "@/app/profiles/BackButton";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

interface ForumAuthor {
  id: string;
  username: string;
}

interface ForumReply {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: ForumAuthor;
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
  replies: ForumReply[];
}

const FORUM_CATEGORIES = [
  "Brewing",
  "Equipment",
  "Ingredients",
  "Troubleshooting",
  "Off-topic",
] as const;

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

export default function CommunityForumPage() {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
  const [replyBody, setReplyBody] = useState("");
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

  async function createTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || submitting) return;

    setSubmitting(true);
    setError("");
    const { error: insertError } = await supabaseBrowser
      .from("forum_topics")
      .insert({
        author_id: userId,
        title: title.trim(),
        body: body.trim(),
        category,
      });

    if (insertError) {
      console.error("Could not create forum topic", insertError);
      setError("Your topic could not be posted. Please try again.");
      setSubmitting(false);
      return;
    }

    setTitle("");
    setBody("");
    setCategory("Brewing");
    try {
      await loadTopics();
    } catch (loadError) {
      console.error("Topic posted but forum refresh failed", loadError);
      setError("Your topic was posted, but the forum could not refresh.");
    } finally {
      setSubmitting(false);
    }
  }

  async function createReply(event: FormEvent<HTMLFormElement>, topicId: string) {
    event.preventDefault();
    if (!userId || submitting) return;

    setSubmitting(true);
    setError("");
    const { error: insertError } = await supabaseBrowser
      .from("forum_replies")
      .insert({
        topic_id: topicId,
        author_id: userId,
        body: replyBody.trim(),
      });

    if (insertError) {
      console.error("Could not create forum reply", insertError);
      setError("Your reply could not be posted. Please try again.");
      setSubmitting(false);
      return;
    }

    setReplyBody("");
    setReplyingTo(null);
    try {
      await loadTopics();
    } catch (loadError) {
      console.error("Reply posted but forum refresh failed", loadError);
      setError("Your reply was posted, but the forum could not refresh.");
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
    const { data, error: updateError } = await supabaseBrowser
      .from("forum_topics")
      .update({ body: editBody.trim() })
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

  async function saveReplyEdit(event: FormEvent<HTMLFormElement>, replyId: string) {
    event.preventDefault();
    if (!userId || submitting) return;

    setSubmitting(true);
    setError("");
    const { data, error: updateError } = await supabaseBrowser
      .from("forum_replies")
      .update({ body: editBody.trim() })
      .eq("id", replyId)
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

        {userId ? (
          <form
            onSubmit={createTopic}
            className="mb-8 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <h2 className="text-xl font-semibold">Start a discussion</h2>
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
              required
              rows={4}
              placeholder="Share some details…"
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg border border-green-500 bg-green-700 px-4 py-2 font-semibold hover:bg-green-600 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Posting…" : "Post discussion"}
            </button>
          </form>
        ) : (
          <p className="mb-8 rounded-lg border border-white/10 bg-white/5 p-4 text-center text-white/70">
            <Link href="/auth/login" className="text-green-300 underline">
              Sign in
            </Link>{" "}
            to start a discussion or reply.
          </p>
        )}

        {error && (
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
                        required
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
                  <p className="mt-3 whitespace-pre-wrap">{topic.body}</p>
                )}
                <p className="mt-3 text-sm text-white/50">
                  {topic.author.username} · {formatDate(topic.created_at)}
                  {new Date(topic.updated_at).getTime() >
                    new Date(topic.created_at).getTime() && (
                    <span className="ml-2 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-white/70">
                      Edited
                    </span>
                  )}
                </p>

                {topic.replies.length > 0 && (
                  <div className="mt-5 space-y-3 border-l border-white/15 pl-4">
                    {topic.replies.map((reply) => (
                      <div key={reply.id} className="rounded-lg bg-black/20 p-3">
                        {editingReply === reply.id ? (
                          <form
                            onSubmit={(event) => saveReplyEdit(event, reply.id)}
                            className="space-y-3"
                          >
                            <textarea
                              value={editBody}
                              onChange={(event) => setEditBody(event.target.value)}
                              maxLength={2000}
                              required
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
                            <p className="whitespace-pre-wrap">{reply.body}</p>
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
                          {reply.author.username} · {formatDate(reply.created_at)}
                          {new Date(reply.updated_at).getTime() >
                            new Date(reply.created_at).getTime() && (
                            <span className="ml-2 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-white/70">
                              Edited
                            </span>
                          )}
                        </p>
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
                          required
                          rows={3}
                          placeholder="Write a reply…"
                          aria-label={`Reply to ${topic.title}`}
                          className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
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
