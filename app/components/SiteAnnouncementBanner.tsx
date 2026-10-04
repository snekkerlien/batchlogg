"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuthContext } from "@/app/providers/AuthProvider";

const DISMISSED_ANNOUNCEMENT_KEY = "batchlogg-dismissed-announcement";

interface Announcement {
  id: string;
  title: string;
  body: string;
}

export default function SiteAnnouncementBanner() {
  const { user, loading } = useAuthContext();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    let active = true;
    setAnnouncement(null);

    if (!user) {
      setDismissedAnnouncementId(null);
      try {
        window.sessionStorage.removeItem(DISMISSED_ANNOUNCEMENT_KEY);
      } catch (error) {
        console.error("Could not clear dismissed site announcement", error);
      }
      return;
    }

    try {
      setDismissedAnnouncementId(
        window.sessionStorage.getItem(DISMISSED_ANNOUNCEMENT_KEY)
      );
    } catch (error) {
      console.error("Could not load dismissed site announcement", error);
      setDismissedAnnouncementId(null);
    }

    async function loadAnnouncement() {
      try {
        const response = await fetch("/api/changelog", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load announcement");
        if (!active) return;

        const nextAnnouncement = data.announcement ?? null;
        setAnnouncement(nextAnnouncement);
        setDismissedAnnouncementId((current) =>
          nextAnnouncement?.id === current ? current : null
        );
      } catch (error) {
        console.error("Could not load site announcement banner", error);
      }
    }

    void loadAnnouncement();
    const interval = window.setInterval(() => void loadAnnouncement(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [loading, user?.id]);

  if (!announcement || announcement.id === dismissedAnnouncementId) return null;

  return (
    <aside
      role="status"
      aria-label="Site announcement"
      className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white backdrop-blur-md"
    >
      <div className="mx-auto flex items-center gap-3">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-green-300">
          Announcement
        </span>
        <div className="min-w-0 flex-1 text-sm leading-5 text-white/75 sm:flex sm:items-baseline sm:gap-2">
          <span className="font-medium text-white">{announcement.title}</span>
          <div className="min-w-0 [&_a]:text-green-300 [&_a]:underline [&_p+p]:mt-1 [&_strong]:font-semibold [&_ul]:ml-5 [&_ul]:list-disc">
            <ReactMarkdown>{announcement.body}</ReactMarkdown>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissedAnnouncementId(announcement.id);
            try {
              window.sessionStorage.setItem(
                DISMISSED_ANNOUNCEMENT_KEY,
                announcement.id
              );
            } catch (error) {
              console.error("Could not save dismissed site announcement", error);
            }
          }}
          aria-label="Hide announcement"
          className="shrink-0 px-1 py-1 text-xs text-white/50 hover:text-white"
        >
          Hide
        </button>
      </div>
    </aside>
  );
}
