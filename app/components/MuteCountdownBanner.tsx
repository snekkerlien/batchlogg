"use client";

import { useCallback, useEffect, useState } from "react";

interface MuteDetails {
  ends_at: string | null;
  reason: string | null;
}

function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
}

export default function MuteCountdownBanner() {
  const [mute, setMute] = useState<MuteDetails | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const loadMute = useCallback(async () => {
    try {
      const response = await fetch("/api/account/restrictions", {
        cache: "no-store",
        credentials: "include",
      });
      const result: { mute?: MuteDetails | null; error?: string } =
        await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not check account restrictions.");
      }
      setMute(result.mute ?? null);
    } catch (loadError) {
      console.error("Could not load mute countdown banner", loadError);
      setMute(null);
    }
  }, []);

  useEffect(() => {
    void loadMute();
    const interval = window.setInterval(loadMute, 60_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadMute();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadMute]);

  useEffect(() => {
    if (!mute?.ends_at) {
      setRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const nextRemaining = new Date(mute.ends_at!).getTime() - Date.now();
      if (nextRemaining <= 0) {
        setRemaining(0);
        void loadMute();
        return;
      }
      setRemaining(nextRemaining);
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [loadMute, mute?.ends_at]);

  if (!mute) return null;

  return (
    <aside
      aria-label="Account restriction status"
      className="rounded-xl border border-amber-300/20 bg-black/60 px-4 py-2 text-center text-sm text-amber-100 backdrop-blur-md"
    >
      {mute.ends_at ? (
        <>
          <span className="font-semibold">Muted until:</span>{" "}
          <time dateTime={mute.ends_at}>
            {new Date(mute.ends_at).toLocaleString("en-GB")}
          </time>
          {remaining !== null && (
            <span className="ml-2 font-semibold">
              Unmute in {formatCountdown(remaining)}
            </span>
          )}
        </>
      ) : (
        <span className="font-semibold">Muted indefinitely</span>
      )}
      {mute.reason && <p className="mt-1 text-white/70">Reason: {mute.reason}</p>}
    </aside>
  );
}
