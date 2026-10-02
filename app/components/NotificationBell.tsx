"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import ConfirmDialog from "@/app/components/ConfirmDialog";

interface ForumReplyNotification {
  kind: "forum_reply";
  id: string;
  topic_id: string;
  created_at: string;
  read_at: string | null;
  topic_title: string;
  reply_body: string;
  reply_author: string;
}

interface BatchReminderNotification {
  kind: "batch_reminder";
  id: string;
  batch_id: string;
  kar_id: string | null;
  type: "manual" | "sg_check";
  message: string;
  remind_at: string;
  created_at: string;
  read_at: string | null;
  batch_name: string;
}

interface SocialNotification {
  kind: "social";
  id: string;
  actor_id: string;
  type: "friend_request" | "message";
  message_id: string | null;
  created_at: string;
  read_at: string | null;
  actor_name: string;
  body: string;
}

type Notification =
  | ForumReplyNotification
  | BatchReminderNotification
  | SocialNotification;

export default function NotificationBell({ onOpen }: { onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearAllError, setClearAllError] = useState("");
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadNotifications = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseBrowser.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const [forumResponse, batchResponse, socialResponse] = await Promise.all([
      fetch("/api/community/notifications", {
        cache: "no-store",
        credentials: "include",
      }),
      fetch("/api/batch-reminders", {
        cache: "no-store",
        credentials: "include",
      }),
      fetch("/api/community/social-notifications", {
        cache: "no-store",
        credentials: "include",
      }),
    ]);

    if (!forumResponse.ok || !batchResponse.ok || !socialResponse.ok) {
      throw new Error(
        `Notification request failed (${forumResponse.status}, ${batchResponse.status}, ${socialResponse.status})`
      );
    }

    const [forumData, batchData, socialData]: [
      { notifications: Omit<ForumReplyNotification, "kind">[]; unreadCount: number },
      { reminders: Omit<BatchReminderNotification, "kind">[]; unreadCount: number },
      { notifications: Omit<SocialNotification, "kind">[]; unreadCount: number },
    ] = await Promise.all([
      forumResponse.json(),
      batchResponse.json(),
      socialResponse.json(),
    ]);
    const combined: Notification[] = [
      ...forumData.notifications.map((notification) => ({
        ...notification,
        kind: "forum_reply" as const,
      })),
      ...batchData.reminders.map((reminder) => ({
        ...reminder,
        kind: "batch_reminder" as const,
      })),
      ...socialData.notifications.map((notification) => ({
        ...notification,
        kind: "social" as const,
      })),
    ].sort((a, b) => {
      const aDate =
        a.kind === "batch_reminder" ? a.remind_at : a.created_at;
      const bDate =
        b.kind === "batch_reminder" ? b.remind_at : b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    setNotifications(combined);
    setUnreadCount(
      forumData.unreadCount + batchData.unreadCount + socialData.unreadCount
    );
  }, []);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        await loadNotifications();
        if (active) setError("");
      } catch (loadError) {
        console.error("Could not load notifications", loadError);
        if (active) setError("Notifications could not be loaded.");
      }
    }

    refresh();
    function handleFocus() {
      refresh();
    }
    window.addEventListener("focus", handleFocus);
    const refreshInterval = window.setInterval(refresh, 60_000);
    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(refreshInterval);
    };
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }

    onOpen();
    setOpen(true);
    setLoading(true);
    void loadNotifications()
      .then(() => setError(""))
      .catch((loadError) => {
        console.error("Could not refresh notifications", loadError);
        setError("Notifications could not be loaded.");
      })
      .finally(() => setLoading(false));
  }

  async function openNotification(notification: Notification) {
    if (!notification.read_at) {
      const endpoint =
        notification.kind === "forum_reply"
          ? "/api/community/notifications"
          : notification.kind === "batch_reminder"
            ? "/api/batch-reminders"
            : "/api/community/social-notifications";
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [notification.id] }),
      });

      if (!response.ok) {
        console.error("Could not mark notification as read", response.status);
        setError("Could not mark this notification as read.");
        return;
      }

      setNotifications((current) =>
        current.map((item) =>
          item.kind === notification.kind && item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    }

    setOpen(false);
    if (notification.kind === "forum_reply") {
      router.push(`/community/forum#forum-topic-${notification.topic_id}`);
    } else if (notification.kind === "batch_reminder") {
      router.push(
        notification.kar_id
          ? `/kar/${notification.kar_id}`
          : "/batchhistorikk"
      );
    } else {
      router.push(
        notification.type === "friend_request"
          ? "/community/friends"
          : `/community/messages?peer_id=${notification.actor_id}`
      );
    }
  }

  async function markAllAsRead() {
    setMarkingAllRead(true);
    setError("");
    try {
      const responses = await Promise.all([
        fetch("/api/community/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ all: true }),
        }),
        fetch("/api/batch-reminders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ all: true }),
        }),
        fetch("/api/community/social-notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ all: true }),
        }),
      ]);

      const failedResponse = responses.find((response) => !response.ok);
      if (failedResponse) {
        const failure = await failedResponse.json().catch(() => ({}));
        throw new Error(
          failure.error || `Could not mark all notifications read (${failedResponse.status})`
        );
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (markError) {
      console.error("Could not mark all notifications as read", markError);
      setError(
        markError instanceof Error
          ? markError.message
          : "Could not mark all notifications as read."
      );
      try {
        await loadNotifications();
      } catch (refreshError) {
        console.error("Could not refresh notifications after mark-all failure", refreshError);
      }
    } finally {
      setMarkingAllRead(false);
    }
  }

  async function clearAllNotifications() {
    setClearingAll(true);
    setClearAllError("");
    try {
      const responses = await Promise.all([
        fetch("/api/community/notifications", {
          method: "DELETE",
          credentials: "include",
        }),
        fetch("/api/batch-reminders?all=true", {
          method: "DELETE",
          credentials: "include",
        }),
        fetch("/api/community/social-notifications", {
          method: "DELETE",
          credentials: "include",
        }),
      ]);

      const failedResponse = responses.find((response) => !response.ok);
      if (failedResponse) {
        const failure = await failedResponse.json().catch(() => ({}));
        throw new Error(
          failure.error || `Could not clear all notifications (${failedResponse.status})`
        );
      }

      setNotifications([]);
      setUnreadCount(0);
      setError("");
      setConfirmClearAll(false);
      return true;
    } catch (clearError) {
      console.error("Could not clear all notifications", clearError);
      const message =
        clearError instanceof Error
          ? clearError.message
          : "Could not clear all notifications.";
      setClearAllError(message);
      setError(message);
      try {
        await loadNotifications();
      } catch (refreshError) {
        console.error("Could not refresh notifications after clear failure", refreshError);
      }
      return false;
    } finally {
      setClearingAll(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        className="relative flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 hover:bg-white/20"
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Notifications"
          className="absolute right-0 top-full z-[60] mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-white/20 bg-zinc-950/95 p-3 text-left shadow-2xl backdrop-blur-md"
        >
          <div className="mb-2 flex items-center justify-between border-b border-white/10 px-1 pb-2">
            <h2 className="font-semibold">Notifications</h2>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <>
                    <span className="text-xs text-green-300">{unreadCount} unread</span>
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      disabled={markingAllRead || clearingAll}
                      className="text-xs text-white/70 underline decoration-white/30 underline-offset-2 hover:text-white disabled:cursor-wait disabled:opacity-50"
                    >
                      {markingAllRead ? "Marking…" : "Mark all as read"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setClearAllError("");
                    setConfirmClearAll(true);
                  }}
                  disabled={clearingAll || markingAllRead}
                  className="text-xs text-red-300 underline decoration-red-300/40 underline-offset-2 hover:text-red-200 disabled:cursor-wait disabled:opacity-50"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
          {error && (
            <p role="alert" className="px-2 py-3 text-sm text-amber-300">
              {error}
            </p>
          )}
          {loading && notifications.length === 0 ? (
            <p className="px-2 py-4 text-sm text-white/60">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="px-2 py-4 text-sm text-white/60">
              You’re all caught up.
            </p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(notification)}
                    className={`w-full rounded-lg p-3 text-left hover:bg-white/10 ${
                      notification.read_at ? "" : "bg-white/5"
                    }`}
                  >
                    {notification.kind === "forum_reply" ? (
                      <>
                        <span className="block text-sm font-semibold text-green-300">
                          {notification.reply_author} replied to your discussion
                        </span>
                        <span className="mt-1 block truncate text-sm font-medium">
                          {notification.topic_title}
                        </span>
                        <span className="mt-1 block text-sm text-white/70">
                          {notification.reply_body}
                        </span>
                        <span className="mt-2 block text-xs text-white/45">
                          {new Date(notification.created_at).toLocaleString(
                            "en-GB",
                            { dateStyle: "medium", timeStyle: "short" }
                          )}
                        </span>
                      </>
                    ) : notification.kind === "batch_reminder" ? (
                      <>
                        <span className="block text-sm font-semibold text-green-300">
                          {notification.type === "sg_check"
                            ? "Gravity check reminder"
                            : "Batch reminder"}
                        </span>
                        <span className="mt-1 block truncate text-sm font-medium">
                          {notification.batch_name}
                        </span>
                        <span className="mt-1 block text-sm text-white/70">
                          {notification.message}
                        </span>
                        <span className="mt-2 block text-xs text-white/45">
                          {new Date(notification.remind_at).toLocaleString(
                            "en-GB",
                            { dateStyle: "medium", timeStyle: "short" }
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block text-sm font-semibold text-green-300">
                          {notification.type === "friend_request"
                            ? "Friend request"
                            : "New message"}
                        </span>
                        <span className="mt-1 block truncate text-sm font-medium">
                          {notification.actor_name}
                        </span>
                        {notification.body && (
                          <span className="mt-1 block truncate text-sm text-white/70">
                            {notification.body}
                          </span>
                        )}
                        <span className="mt-2 block text-xs text-white/45">
                          {new Date(notification.created_at).toLocaleString(
                            "en-GB",
                            { dateStyle: "medium", timeStyle: "short" }
                          )}
                        </span>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <ConfirmDialog
        open={confirmClearAll}
        title="Clear all notifications?"
        message={
          clearAllError ||
          "This removes your forum notifications and due batch reminders. Future scheduled batch reminders will remain."
        }
        confirmLabel={clearingAll ? "Clearing…" : "Clear all"}
        onConfirm={clearAllNotifications}
        onCancel={() => {
          if (!clearingAll) {
            setConfirmClearAll(false);
            setClearAllError("");
          }
        }}
      />
    </div>
  );
}
