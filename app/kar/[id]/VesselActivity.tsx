"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [loading, setLoading] = useState(true);
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

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
      {premiumRequired ? (
        <p className="text-sm text-white/70">
          Shared vessel notes and activity are Premium features.{" "}
          <Link href="/premium" className="text-green-200 underline">Explore Premium</Link>
        </p>
      ) : (
        <>
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
