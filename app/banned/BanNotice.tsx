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
  appealStatus,
  appealMessages,
}: {
  endsAt: string | null;
  reason: string | null;
  appealStatus: "pending" | "info_requested" | "granted" | "dismissed" | null;
  appealMessages: Array<{
    id: string;
    sender_role: "user" | "admin";
    message: string;
    created_at: string;
  }>;
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
          ? "Your message was saved, but the admin email notification could not be sent."
          : "Your message has been sent to the administrators."
      );
      setAppealOpen(false);
      router.refresh();
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

      {appealStatus && (
        <section
          aria-labelledby="appeal-status-title"
          className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <h2 id="appeal-status-title" className="font-semibold text-white">
            Appeal status: {appealStatus.replace("_", " ")}
          </h2>
          <ol className="mt-3 space-y-3">
            {appealMessages.map((item) => (
              <li
                key={item.id}
                className={`rounded-lg border p-3 ${
                  item.sender_role === "admin"
                    ? "border-amber-300/20 bg-amber-950/20"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <p className="text-xs text-white/55">
                  {item.sender_role === "admin" ? "Admin request" : "Your message"} ·{" "}
                  {new Date(item.created_at).toLocaleString("en-GB")}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-white/85">
                  {item.message}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-8 text-center">
        {appealStatus === null ? (
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
        ) : appealStatus === "info_requested" ? (
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setAppealOpen(true);
            }}
            className="rounded-lg bg-amber-700 px-5 py-3 font-semibold hover:bg-amber-600"
          >
            Send requested information
          </button>
        ) : (
          <p className="text-sm text-white/60">
            {appealStatus === "pending"
              ? "Your appeal is awaiting review. You can send another message only if an admin requests more information."
              : appealStatus === "granted"
                ? "Your appeal was granted. Refresh the page to continue if your ban has been lifted."
                : "Your appeal was dismissed. You cannot submit another appeal."}
          </p>
        )}
        {success && <p role="status" className="mt-3 text-sm text-green-300">{success}</p>}
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
                  {appealStatus === "info_requested" ? "Reply to admin request" : "Plead for mercy"}
                </h2>
                <p className="mt-2 text-sm text-white/65">
                  {appealStatus === "info_requested"
                    ? "An administrator requested more information about your appeal. You may send one reply."
                    : "Explain why you believe your ban should be reviewed. You can only submit one appeal."}
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
                placeholder={
                  appealStatus === "info_requested"
                    ? "Reply to the administrator's request."
                    : "Explain why you are appealing the ban."
                }
              />
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-red-700 px-4 py-3 font-semibold hover:bg-red-600 disabled:cursor-wait disabled:opacity-50"
              >
                {submitting
                  ? "Sending…"
                  : appealStatus === "info_requested"
                    ? "Send reply"
                    : "Send appeal"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
