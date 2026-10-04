"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

interface ChangelogEntry {
  version: string;
  entry_date: string;
  title: string;
  body: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

async function responseJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Content request failed");
  return data;
}

export function AdminContentClient() {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [version, setVersion] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [announcementStarts, setAnnouncementStarts] = useState("");
  const [announcementEnds, setAnnouncementEnds] = useState("");
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  const load = useCallback(async () => {
    const [data, statusData] = await Promise.all([
      responseJson(await fetch("/api/admin/content", { cache: "no-store", credentials: "include" })),
      responseJson(await fetch("/api/site-status", { cache: "no-store" })),
    ]);
    setChangelog(data.changelog);
    setAnnouncements(data.announcements);
    setMaintenanceMessage(statusData.maintenanceNotice ?? "");
    setMaintenanceEnabled(!!statusData.maintenanceNotice);
  }, []);

  useEffect(() => {
    load()
      .catch((loadError) => {
        console.error("Could not load admin content", loadError);
        setError("Could not load content management data.");
      })
      .finally(() => setLoading(false));
  }, [load]);

  async function saveChangelog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved("");
    try {
      await responseJson(await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind: "changelog", version, date, title, body }),
      }));
      setSaved("Changelog entry saved.");
      await load();
    } catch (saveError) {
      console.error("Could not save changelog entry", saveError);
      setError(saveError instanceof Error ? saveError.message : "Could not save changelog.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved("");
    try {
      await responseJson(await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind: "announcement",
          title: announcementTitle,
          body: announcementBody,
          isActive: announcementActive,
          startsAt: announcementStarts ? new Date(announcementStarts).toISOString() : null,
          endsAt: announcementEnds ? new Date(announcementEnds).toISOString() : null,
        }),
      }));
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setAnnouncementStarts("");
      setAnnouncementEnds("");
      setSaved("Announcement created.");
      await load();
    } catch (saveError) {
      console.error("Could not create announcement", saveError);
      setError(saveError instanceof Error ? saveError.message : "Could not create announcement.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(kind: "changelog" | "announcement", id: string) {
    if (!window.confirm(`Delete this ${kind} entry?`)) return;
    setError("");
    try {
      await responseJson(await fetch(
        `/api/admin/content?kind=${kind}&id=${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" }
      ));
      await load();
    } catch (deleteError) {
      console.error(`Could not delete ${kind}`, deleteError);
      setError(deleteError instanceof Error ? deleteError.message : `Could not delete ${kind}.`);
    }
  }

  async function saveMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingMaintenance(true);
    setError("");
    setSaved("");
    try {
      await responseJson(await fetch("/api/site-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: maintenanceEnabled, message: maintenanceMessage }),
      }));
      window.dispatchEvent(new Event("site-status-updated"));
      setSaved(maintenanceEnabled ? "Service notice is live." : "Service notice is disabled.");
    } catch (saveError) {
      console.error("Could not save service notice", saveError);
      setError(saveError instanceof Error ? saveError.message : "Could not update service notice.");
    } finally {
      setSavingMaintenance(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-5xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-10">
        <Link href="/admin" className="absolute left-4 top-4 rounded border border-white/20 px-3 py-2 text-sm">
          Back to admin
        </Link>
        <div className="absolute right-4 top-4"><MenuOverlay current="admin" /></div>
        <PageHeading title="Site content" subtitle="Manage update notes and member announcements." />
        {error && <p role="alert" className="my-4 rounded border border-red-400/40 bg-red-900/30 p-3">{error}</p>}
        {saved && <p role="status" className="my-4 rounded border border-green-400/40 bg-green-900/20 p-3">{saved}</p>}

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-green-200">Changelog</h2>
            <form onSubmit={saveChangelog} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <label className="block text-sm">Version
                <input required maxLength={32} value={version} onChange={(event) => setVersion(event.target.value)} placeholder="0.3.0" className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2" />
              </label>
              <label className="block text-sm">Release date
                <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2" />
              </label>
              <label className="block text-sm">Title
                <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2" />
              </label>
              <label className="block text-sm">Markdown body
                <textarea required maxLength={10000} rows={6} value={body} onChange={(event) => setBody(event.target.value)} className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2" />
              </label>
              <button disabled={saving} className="rounded border border-green-400/40 bg-green-800/60 px-4 py-2 font-semibold disabled:opacity-50">
                {saving ? "Saving…" : "Save changelog entry"}
              </button>
              <p className="text-xs text-white/50">Saving an existing version edits that entry.</p>
            </form>
            {loading ? <p className="text-white/60">Loading…</p> : (
              <ul className="space-y-2">
                {changelog.map((entry) => (
                  <li key={entry.version} className="flex items-center justify-between gap-3 rounded border border-white/10 p-3">
                    <button type="button" onClick={() => {
                      setVersion(entry.version);
                      setDate(entry.entry_date);
                      setTitle(entry.title);
                      setBody(entry.body);
                    }} className="min-w-0 text-left hover:text-green-200">
                      <span className="block font-medium">{entry.version} · {entry.title}</span>
                      <span className="text-xs text-white/50">{entry.entry_date}</span>
                    </button>
                    <button type="button" onClick={() => void remove("changelog", entry.version)} className="text-xs text-red-300 underline">Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-green-200">Announcements</h2>
            <form onSubmit={saveAnnouncement} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <label className="block text-sm">Title
                <input required maxLength={160} value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2" />
              </label>
              <label className="block text-sm">Message
                <textarea required maxLength={5000} rows={5} value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={announcementActive} onChange={(event) => setAnnouncementActive(event.target.checked)} />
                Active immediately (optional schedule still applies)
              </label>
              <label className="block text-sm">Starts (optional)
                <input type="datetime-local" value={announcementStarts} onChange={(event) => setAnnouncementStarts(event.target.value)} className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2" />
              </label>
              <label className="block text-sm">Ends (optional)
                <input type="datetime-local" value={announcementEnds} onChange={(event) => setAnnouncementEnds(event.target.value)} className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2" />
              </label>
              <button disabled={saving} className="rounded border border-green-400/40 bg-green-800/60 px-4 py-2 font-semibold disabled:opacity-50">
                {saving ? "Saving…" : "Create announcement"}
              </button>
            </form>
            {loading ? <p className="text-white/60">Loading…</p> : (
              <ul className="space-y-2">
                {announcements.map((announcement) => (
                  <li key={announcement.id} className="flex items-start justify-between gap-3 rounded border border-white/10 p-3">
                    <div className="min-w-0">
                      <p className="font-medium">{announcement.title}</p>
                      <p className="line-clamp-2 text-sm text-white/60">{announcement.body}</p>
                      <p className="mt-1 text-xs text-white/45">{announcement.is_active ? "Active" : "Inactive"}</p>
                    </div>
                    <button type="button" onClick={() => void remove("announcement", announcement.id)} className="shrink-0 text-xs text-red-300 underline">Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <section className="mt-8 rounded-xl border border-amber-300/20 bg-amber-300/5 p-5">
          <h2 className="text-xl font-semibold text-amber-100">Maintenance notice</h2>
          <p className="mt-1 text-sm text-white/55">
            This displays an announcement banner across the site; it does not disable access or put the app in read-only mode.
          </p>
          <form onSubmit={saveMaintenance} className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={maintenanceEnabled} onChange={(event) => setMaintenanceEnabled(event.target.checked)} />
              Show service notice
            </label>
            <label className="block text-sm">Notice
              <textarea
                value={maintenanceMessage}
                onChange={(event) => setMaintenanceMessage(event.target.value)}
                maxLength={500}
                rows={2}
                placeholder="We will be performing maintenance…"
                className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2"
              />
            </label>
            <button disabled={savingMaintenance} className="rounded border border-amber-300/30 bg-amber-900/30 px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {savingMaintenance ? "Saving…" : "Save service notice"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
