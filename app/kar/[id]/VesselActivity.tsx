"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Activity = {
  id: string;
  username: string;
  activity_type: string;
  content: string | null;
  created_at: string;
};

export default function VesselActivity({ karId }: { karId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [content, setContent] = useState("");
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadActivity = useCallback(async () => {
    const response = await fetch(`/api/kar/${encodeURIComponent(karId)}/activity`, {
      credentials: "include",
      cache: "no-store",
    });
    const result: { activities?: Activity[]; error?: string } = await response.json();
    if (response.status === 403) {
      setPremiumRequired(true);
      return;
    }
    if (!response.ok) throw new Error(result.error || "Could not load shared activity");
    setPremiumRequired(false);
    setActivities(result.activities ?? []);
  }, [karId]);

  useEffect(() => {
    let active = true;
    loadActivity()
      .catch((loadError) => {
        console.error("Could not load shared vessel activity", loadError);
        if (active) setError("Shared notes could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadActivity]);

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/kar/${encodeURIComponent(karId)}/activity`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const result: { activity?: Activity; error?: string } = await response.json();
      if (response.status === 403) setPremiumRequired(true);
      if (!response.ok) throw new Error(result.error || "Could not save shared note");
      setContent("");
      if (result.activity) setActivities((current) => [result.activity!, ...current]);
    } catch (saveError) {
      console.error("Could not save shared vessel note", saveError);
      setError(saveError instanceof Error ? saveError.message : "Could not save shared note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 text-lg font-semibold text-green-200">Shared notes & activity</h2>
      {premiumRequired ? (
        <p className="text-sm text-white/70">
          Shared vessel notes and activity are Premium features.{" "}
          <Link href="/premium" className="text-green-200 underline">Explore Premium</Link>
        </p>
      ) : (
        <>
          <form onSubmit={addNote} className="mb-4 space-y-2">
            <label className="block text-sm text-white/70">
              Note for everyone collaborating on this vessel
              <textarea
                required
                maxLength={2000}
                rows={3}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
              />
            </label>
            <button disabled={saving} className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {saving ? "Saving…" : "Add shared note"}
            </button>
          </form>
          {loading ? (
            <p className="text-sm text-white/60">Loading activity…</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-white/60">No shared notes yet.</p>
          ) : (
            <ol className="space-y-2">
              {activities.map((activity) => (
                <li key={activity.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="text-xs text-white/50">
                    {activity.username} · {new Date(activity.created_at).toLocaleString()}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">{activity.content}</p>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    </section>
  );
}
