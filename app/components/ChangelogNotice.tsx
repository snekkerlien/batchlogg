"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuthContext } from "@/app/providers/AuthProvider";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  body: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
}

export default function ChangelogNotice() {
  const { user } = useAuthContext();
  const [changelog, setChangelog] = useState<ChangelogEntry | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setVisible(false);
      setChangelog(null);
      setAnnouncement(null);
      return;
    }
    setLoading(true);

    async function loadNotices() {
      const [updatesResponse, { data: profile, error: profileError }] = await Promise.all([
        fetch("/api/changelog", { cache: "no-store" }),
        supabaseBrowser
          .from("profiles")
          .select("last_viewed_changelog_version, last_viewed_announcement_id")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      if (!updatesResponse.ok) {
        throw new Error(`Could not load site updates (${updatesResponse.status})`);
      }
      if (profileError) throw profileError;
      const updates: {
        changelog: ChangelogEntry | null;
        announcement: Announcement | null;
      } = await updatesResponse.json();
      if (!active) return;
      const nextChangelog =
        updates.changelog?.version !== profile?.last_viewed_changelog_version
          ? updates.changelog
          : null;
      const nextAnnouncement =
        updates.announcement?.id !== profile?.last_viewed_announcement_id
          ? updates.announcement
          : null;
      setChangelog(nextChangelog);
      setAnnouncement(nextAnnouncement);
      setVisible(!!nextChangelog || !!nextAnnouncement);
      setError("");
    }

    void loadNotices()
      .catch((loadError) => {
        console.error("Could not load site updates", loadError);
        if (active) setError("Site updates could not be checked. Please reload to try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!visible) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") void closeNotice();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [visible, changelog, announcement, user?.id]);

  async function closeNotice() {
    if (!user || (!changelog && !announcement) || saving) return;
    setSaving(true);
    setError("");
    const updates: Record<string, string> = {};
    if (changelog) updates.last_viewed_changelog_version = changelog.version;
    if (announcement) updates.last_viewed_announcement_id = announcement.id;
    const { error: saveError } = await supabaseBrowser
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (saveError) {
      console.error("Could not save viewed site updates", saveError);
      setError("Could not save that you have read these updates. Please try again.");
      setSaving(false);
      return;
    }
    setVisible(false);
    setSaving(false);
  }

  if (loading && !error) return null;
  if (error && !visible) {
    return (
      <p role="alert" className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg border border-amber-400/40 bg-zinc-950 p-3 text-sm text-amber-200">
        {error}
      </p>
    );
  }
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-updates-title"
        className="max-h-[min(85vh,48rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-5 text-white shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-300">
              {announcement ? "Announcement" : `What’s new · ${changelog?.version}`}
            </p>
            <h2 id="site-updates-title" className="mt-2 text-2xl font-bold">
              {announcement?.title ?? changelog?.title}
            </h2>
            {changelog && !announcement && (
              <p className="mt-1 text-sm text-white/50">{changelog.date}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void closeNotice()}
            disabled={saving}
            aria-label="Close site updates"
            className="shrink-0 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Close"}
          </button>
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-amber-300">{error}</p>}
        <div className="mt-5 space-y-5 text-sm leading-6 text-white/80 [&_a]:text-green-300 [&_a]:underline [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:mt-3 [&_strong]:font-semibold [&_ul]:space-y-1">
          {announcement && <ReactMarkdown>{announcement.body}</ReactMarkdown>}
          {announcement && changelog && <hr className="border-white/10" />}
          {changelog && (
            <section>
              {announcement && <h3 className="font-semibold text-green-200">What’s new · {changelog.version}</h3>}
              {!announcement && <p className="text-xs text-white/50">{changelog.date}</p>}
              <ReactMarkdown>{changelog.body}</ReactMarkdown>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
