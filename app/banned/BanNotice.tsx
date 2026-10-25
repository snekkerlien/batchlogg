"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
}

export default function BanNotice({
  endsAt,
  reason,
}: {
  endsAt: string | null;
  reason: string | null;
}) {
  const router = useRouter();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appeal, setAppeal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!appealOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) setAppealOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [appealOpen, submitting]);

  useEffect(() => {
    if (!endsAt) return;

    const updateCountdown = () => {
      const nextRemaining = new Date(endsAt).getTime() - Date.now();
      if (nextRemaining <= 0) {
        router.replace("/dashboard");
        return;
      }
      setRemaining(nextRemaining);
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [endsAt, router]);

  async function submitAppeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/account/ban-appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: appeal }),
      });
      const result: { error?: string; notificationWarning?: boolean } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send your appeal.");
      setAppeal("");
      setSuccess(
        result.notificationWarning
          ? "Your appeal was saved, but the admin email notification could not be sent."
          : "Your appeal has been sent to the administrators."
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not send your appeal. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-red-300">You are banned</h1>
        <p className="mt-4 text-white/80">
          Your account is currently banned from using Batchlogg.
        </p>
        {reason && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-center text-white/75">
            <p className="font-semibold text-white">Reason:</p>
            <p className="mt-1 whitespace-pre-wrap">{reason}</p>
          </div>
        )}
        {endsAt && (
          <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
            <p>
              Ban lifted:{" "}
              <time dateTime={endsAt}>
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                }).format(new Date(endsAt))}{" "}
                UTC
              </time>
            </p>
            {remaining !== null && (
              <p className="mt-2 text-lg font-semibold" aria-live="off">
                Time remaining: {formatCountdown(remaining)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => {
            setError("");
            setSuccess("");
            setAppealOpen(true);
          }}
          className="rounded-lg bg-red-700 px-5 py-3 font-semibold hover:bg-red-600"
        >
          Plead for mercy
        </button>
      </div>

      {appealOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setAppealOpen(false);
            }
          }}
        >
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onMouseDown={() => {
              if (!submitting) setAppealOpen(false);
            }}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ban-appeal-title"
            className="relative z-10 w-full max-w-lg rounded-2xl border border-white/15 bg-zinc-900 p-6 text-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="ban-appeal-title" className="text-xl font-semibold">
                  Plead for mercy
                </h2>
                <p className="mt-2 text-sm text-white/65">
                  Though gates are shut and shadows fall, a heartfelt plea may change it all. Leave your words; the keepers may hear, and turn the key to draw you near.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close appeal"
                onClick={() => setAppealOpen(false)}
                disabled={submitting}
                className="rounded-lg px-2 py-1 text-xl text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitAppeal} className="mt-5 space-y-3">
              <label className="sr-only" htmlFor="ban-appeal">
                Appeal message
              </label>
              <textarea
                id="ban-appeal"
                value={appeal}
                onChange={(event) => setAppeal(event.target.value)}
                minLength={3}
                maxLength={3000}
                required
                rows={5}
                className="w-full rounded-lg border border-white/20 bg-black/50 p-3 text-white"
                placeholder="Set down your words and make your case clear."
              />
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              {success && <p role="status" className="text-sm text-green-300">{success}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-red-700 px-4 py-3 font-semibold hover:bg-red-600 disabled:cursor-wait disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send appeal"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
