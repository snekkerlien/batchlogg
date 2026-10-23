"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import ReportContentButton from "@/app/components/ReportContentButton";

interface Conversation {
  id: string;
  username: string;
  avatar_url: string | null;
  latest: CommunityMessage | null;
  unreadCount: number;
}

interface CommunityMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface Peer {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const peerId = searchParams.get("peer_id");
  const requestedReturnTo = searchParams.get("return_to");
  const currentPeerIdRef = useRef(peerId);
  currentPeerIdRef.current = peerId;
  const returnTo =
    requestedReturnTo?.startsWith("/") &&
    !requestedReturnTo.startsWith("//") &&
    !requestedReturnTo.startsWith("/community/messages")
      ? requestedReturnTo
      : undefined;
  const returnToQuery = returnTo ? `&return_to=${encodeURIComponent(returnTo)}` : "";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [failedMessageText, setFailedMessageText] = useState("");
  const [failedMessagePeerId, setFailedMessagePeerId] = useState("");
  const [draftReadyKey, setDraftReadyKey] = useState("");
  const [draftStorageError, setDraftStorageError] = useState("");
  const draftKey =
    userId && peerId ? `batchlogg-message-draft:${userId}:${peerId}` : "";

  useEffect(() => {
    setError("");
    setStatus("");
    setFailedMessageText("");
    setFailedMessagePeerId("");
  }, [peerId]);

  useEffect(() => {
    if (!draftKey) return;
    setDraftReadyKey("");
    try {
      setMessageText(window.localStorage.getItem(draftKey) ?? "");
      setDraftStorageError("");
    } catch (storageError) {
      console.error("Could not load message draft", storageError);
      setDraftStorageError("This draft could not be saved between visits.");
      setMessageText("");
    }
    setDraftReadyKey(draftKey);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || draftReadyKey !== draftKey) return;
    try {
      if (messageText) {
        window.localStorage.setItem(draftKey, messageText);
      } else {
        window.localStorage.removeItem(draftKey);
      }
      setDraftStorageError("");
    } catch (storageError) {
      console.error("Could not save message draft", storageError);
      setDraftStorageError("This draft could not be saved between visits.");
    }
  }, [draftKey, draftReadyKey, messageText]);

  const loadInbox = useCallback(async () => {
    const response = await fetch("/api/community/messages", {
      cache: "no-store",
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load inbox");
    setConversations(data.conversations);
  }, []);

  const loadConversation = useCallback(async (id: string, preserveOlder = false) => {
    const response = await fetch(
      `/api/community/messages?peer_id=${encodeURIComponent(id)}`,
      { cache: "no-store", credentials: "include" }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load conversation");
    setPeer(data.peer);
    setMessages((current) => {
      if (!preserveOlder) return data.messages;
      const merged = new Map(current.map((message) => [message.id, message]));
      for (const message of data.messages) merged.set(message.id, message);
      return [...merged.values()].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
    if (!preserveOlder) setHasOlderMessages(data.hasMore);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setPeer(null);
    async function load() {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        router.replace("/auth/login");
        return;
      }
      setUserId(session.user.id);
      await loadInbox();
      if (peerId) await loadConversation(peerId);
    }

    load()
      .catch((loadError) => {
        console.error("Could not load community messages", loadError);
        if (active) setLoadError(loadError instanceof Error ? loadError.message : "Could not load messages.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt, loadConversation, loadInbox, peerId, router]);

  useEffect(() => {
    if (!peerId) return;
    const selectedPeerId = peerId;

    async function refreshConversation() {
      if (document.visibilityState !== "visible") return;
      try {
        await Promise.all([loadInbox(), loadConversation(selectedPeerId, true)]);
      } catch (refreshError) {
        console.error("Could not refresh conversation", refreshError);
        setLoadError("Could not refresh the conversation.");
      }
    }

    const interval = window.setInterval(refreshConversation, 30_000);
    window.addEventListener("focus", refreshConversation);
    document.addEventListener("visibilitychange", refreshConversation);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshConversation);
      document.removeEventListener("visibilitychange", refreshConversation);
    };
  }, [loadConversation, loadInbox, peerId]);

  async function sendMessageText(text: string) {
    if (!peerId || !peer || !text.trim()) return;
    const sendingPeerId = peerId;
    setSending(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/community/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ peerId: sendingPeerId, message: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send message");
      if (currentPeerIdRef.current !== sendingPeerId) return;
      setMessages((current) => [...current, data.message]);
      setFailedMessageText("");
      setFailedMessagePeerId("");
      if (messageText === text) setMessageText("");
      if (data.warning) setStatus(data.warning);
      try {
        await loadInbox();
      } catch (inboxError) {
        console.error("Message sent, but inbox could not refresh", inboxError);
        setLoadError("Message sent, but the inbox could not refresh.");
      }
    } catch (sendError) {
      if (currentPeerIdRef.current !== sendingPeerId) return;
      console.error("Could not send message", sendError);
      setFailedMessageText(text);
      setFailedMessagePeerId(peerId);
      setError(sendError instanceof Error ? sendError.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessageText(messageText);
  }

  async function loadOlderMessages() {
    if (!peerId || !messages.length || loadingOlder) return;
    setLoadingOlder(true);
    setError("");
    try {
      const cursor = messages[0].created_at;
      const response = await fetch(
        `/api/community/messages?peer_id=${encodeURIComponent(peerId)}&before=${encodeURIComponent(cursor)}`,
        { cache: "no-store", credentials: "include" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load older messages");
      setMessages((current) => [...data.messages, ...current]);
      setHasOlderMessages(data.hasMore);
    } catch (loadError) {
      console.error("Could not load older messages", loadError);
      setError(loadError instanceof Error ? loadError.message : "Could not load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function blockPeer() {
    if (!peerId) return false;
    setError("");
    try {
      const response = await fetch("/api/community/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "block", userId: peerId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not block user");
      router.push("/community/friends");
      return true;
    } catch (blockError) {
      console.error("Could not block conversation member", blockError);
      setError(blockError instanceof Error ? blockError.message : "Could not block user.");
      return false;
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!peerId) return;
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/community/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "report",
          userId: peerId,
          reason: reportReason,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit report");
      setReportReason("");
      setShowReport(false);
      setStatus("Report submitted. Thank you for helping keep the community safe.");
    } catch (reportError) {
      console.error("Could not submit community report", reportError);
      setError(reportError instanceof Error ? reportError.message : "Could not submit report.");
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-white">Loading messages…</main>;
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto w-full max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute left-4 top-4 z-40">
          <BackButton href={returnTo} />
        </div>
        <div className="absolute right-4 top-4 z-40">
          <MenuOverlay current="messages" />
        </div>
        <PageHeading
          title="Messages"
          subtitle="Private conversations with accepted friends."
        />
        {error && <p role="alert" className="mb-4 text-sm text-amber-300">{error}</p>}
        {loadError && (
          <div role="alert" className="mb-4 rounded-lg border border-amber-400/30 bg-amber-950/30 p-3 text-sm text-amber-200">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              className="mt-2 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 font-semibold text-white hover:bg-white/20"
            >
              Try again
            </button>
          </div>
        )}
        {status && <p role="status" className="mb-4 text-sm text-green-300">{status}</p>}

        {peerId ? (
          <section className="overflow-hidden rounded-xl border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    router.replace(
                      `/community/messages${returnToQuery ? `?${returnToQuery.slice(1)}` : ""}`
                    )
                  }
                  className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10"
                  aria-label="Back to inbox"
                >
                  ←
                </button>
                {peer ? (
                  <div className="flex items-center gap-3">
                    <Image src={peer.avatar_url || "/default-avatar.png"} alt="" width={40} height={40} sizes="40px" unoptimized className="h-10 w-10 rounded-full object-cover" />
                    <h2 className="font-semibold">{peer.username}</h2>
                  </div>
                ) : (
                  <h2 className="font-semibold text-amber-200">Conversation unavailable</h2>
                )}
              </div>
              {peer && <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowReport((value) => !value)}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
                >
                  Report
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmBlock(true)}
                  className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-200 hover:bg-red-950/50"
                >
                  Block
                </button>
              </div>}
            </div>
            {peer && showReport && (
              <form onSubmit={submitReport} className="border-b border-white/10 bg-white/5 p-4">
                <label htmlFor="community-report" className="mb-2 block text-sm">
                  Tell us why you’re reporting this user (10-2000 characters)
                </label>
                <textarea
                  id="community-report"
                  required
                  minLength={10}
                  maxLength={2000}
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="min-h-24 w-full rounded-lg border border-white/20 bg-black/40 p-3"
                />
                <button className="mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">
                  Submit report
                </button>
              </form>
            )}
            {peer && <ol className="flex max-h-[55vh] min-h-72 flex-col gap-3 overflow-y-auto p-4">
              {hasOlderMessages && (
                <li className="self-center">
                  <button
                    type="button"
                    onClick={loadOlderMessages}
                    disabled={loadingOlder}
                    className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/75 hover:bg-white/10 disabled:opacity-50"
                  >
                    {loadingOlder ? "Loading…" : "Load older messages"}
                  </button>
                </li>
              )}
              {messages.length ? messages.map((message) => {
                const ownMessage = message.sender_id === userId;
                return (
                  <li key={message.id} className={`max-w-[85%] rounded-xl p-3 ${ownMessage ? "self-end bg-green-800/70" : "self-start bg-white/10"}`}>
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <time className="mt-2 block text-right text-xs text-white/55">
                      {new Date(message.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                    {ownMessage && (
                      <span className="mt-1 block text-right text-xs text-white/55">
                        {message.read_at ? "Read" : "Sent"}
                      </span>
                    )}
                    {!ownMessage && (
                      <div className="mt-2 text-right">
                        <ReportContentButton
                          contentType="message"
                          contentId={message.id}
                          contextUrl={`/community/messages?peer_id=${encodeURIComponent(peerId ?? "")}`}
                        />
                      </div>
                    )}
                  </li>
                );
              }) : <li className="m-auto text-sm text-white/55">Start the conversation.</li>}
            </ol>}
            {peer && <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-4">
              <textarea
                aria-label="Write a message"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key !== "Enter" ||
                    event.shiftKey ||
                    event.nativeEvent.isComposing
                  ) {
                    return;
                  }
                  event.preventDefault();
                  if (!sending) event.currentTarget.form?.requestSubmit();
                }}
                maxLength={2000}
                required
                rows={2}
                placeholder="Write a message…"
                className="min-w-0 flex-1 resize-y rounded-lg border border-white/20 bg-black/40 p-3"
              />
              <button
                type="submit"
                disabled={sending || !messageText.trim()}
                className="self-end rounded-lg border border-green-500/50 bg-green-700 px-4 py-2 font-semibold hover:bg-green-600 disabled:cursor-wait disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </form>}
            {peer && (
              <p className="border-t border-white/10 px-4 py-2 text-xs text-white/50">
                Unsent text is saved as a draft on this device.
              </p>
            )}
            {peer && draftStorageError && (
              <p role="status" className="border-t border-white/10 px-4 py-2 text-xs text-amber-200">
                {draftStorageError}
              </p>
            )}
            {peer && failedMessageText && failedMessagePeerId === peerId && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-400/20 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
                <span>Message not sent. Your text is still here.</span>
                <button
                  type="button"
                  onClick={() => void sendMessageText(failedMessageText)}
                  disabled={sending}
                  className="rounded-lg border border-amber-200/30 bg-amber-100/10 px-3 py-2 font-semibold hover:bg-amber-100/20 disabled:cursor-wait disabled:opacity-60"
                >
                  {sending ? "Retrying…" : "Retry send"}
                </button>
              </div>
            )}
          </section>
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-green-300">Inbox</h2>
              <button
                type="button"
                onClick={() => router.push("/community/friends")}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
              >
                Find friends
              </button>
            </div>
            {loadError ? (
              <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/65">
                Inbox is unavailable until messages load.
              </p>
            ) : conversations.length ? (
              <ul className="space-y-2">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() =>
                        router.replace(
                          `/community/messages?peer_id=${encodeURIComponent(conversation.id)}${returnToQuery}`
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left hover:bg-white/10 ${
                        conversation.unreadCount > 0
                          ? "border-green-400/40 bg-green-950/30"
                          : "border-white/10 bg-white/5"
                      }`}
                      aria-label={`${conversation.username}${conversation.unreadCount > 0 ? `, ${conversation.unreadCount} unread messages` : ""}`}
                    >
                      <Image src={conversation.avatar_url || "/default-avatar.png"} alt="" width={48} height={48} sizes="48px" unoptimized className="h-12 w-12 rounded-full object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className={`block ${conversation.unreadCount > 0 ? "font-bold text-white" : "font-semibold"}`}>
                          {conversation.username}
                          {conversation.unreadCount > 0 && (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-green-200">
                              Unread
                            </span>
                          )}
                        </span>
                        <span className={`block truncate text-sm ${conversation.unreadCount > 0 ? "font-medium text-white/85" : "text-white/60"}`}>
                          {conversation.latest?.body || "No messages yet"}
                        </span>
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span aria-hidden="true" className="rounded-full bg-green-600 px-2 py-1 text-xs font-bold">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                <p className="text-white/65">No conversations yet. Find a brewer to start a conversation.</p>
                <button
                  type="button"
                  onClick={() => router.push("/community/friends")}
                  className="mt-4 rounded-lg border border-green-500/40 bg-green-800/60 px-4 py-2 font-semibold hover:bg-green-700"
                >
                  Find brewers
                </button>
              </div>
            )}
          </section>
        )}
      </div>
      <ConfirmDialog
        open={confirmBlock}
        title="Block this user?"
        message="This removes the friendship and prevents both of you from sending friend requests or messages to each other. Existing messages are retained."
        confirmLabel="Block user"
        onConfirm={blockPeer}
        onCancel={() => setConfirmBlock(false)}
      />
    </main>
  );
}
