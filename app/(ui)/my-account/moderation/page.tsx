"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

interface ModerationAction {
  id: string;
  action_type: "warning" | "mute";
  reason: string;
  restriction_ends_at: string | null;
  created_at: string;
  moderator: string;
  appeal: {
    id: string;
    appeal_text: string;
    status: "pending" | "upheld" | "overturned";
    resolution_note: string | null;
    reviewed_at: string | null;
  } | null;
}

export default function MyModerationPage() {
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [appealTexts, setAppealTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadActions = useCallback(async () => {
    const response = await fetch("/api/account/moderation", {
      credentials: "include",
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load moderation history.");
    setActions(data.actions ?? []);
  }, []);

  useEffect(() => {
    loadActions()
      .catch((loadError) => {
        console.error("Could not load account moderation history", loadError);
        setError("Moderation history could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, [loadActions]);

  async function submitAppeal(event: FormEvent<HTMLFormElement>, actionId: string) {
    event.preventDefault();
    setSubmittingId(actionId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/account/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          actionId,
          appealText: appealTexts[actionId] ?? "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit appeal.");
      await loadActions();
      setAppealTexts((current) => ({ ...current, [actionId]: "" }));
      setNotice("Your appeal has been sent to the moderation team.");
    } catch (submitError) {
      console.error("Could not submit moderation appeal", submitError);
      setError(submitError instanceof Error ? submitError.message : "Could not submit appeal.");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-12 text-white sm:px-6">
      <div className="relative mx-auto mt-12 max-w-3xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute left-4 top-4">
          <BackButton />
        </div>
        <div className="absolute right-4 top-4">
          <MenuOverlay current="account" />
        </div>
        <PageHeading
          title="Moderation history"
          subtitle="Review community warnings and posting restrictions, and appeal a decision."
        />
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-900/40 p-3 text-sm text-red-100">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-green-900/40 p-3 text-sm text-green-100">{notice}</p>}
        {loading ? (
          <p role="status" className="text-center text-white/60">Loading moderation history…</p>
        ) : actions.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-white/5 p-5 text-center text-white/60">
            There are no moderation actions on your account.
          </p>
        ) : (
          <ul className="space-y-4">
            {actions.map((action) => (
              <li key={action.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold capitalize text-amber-100">{action.action_type}</h2>
                  <time className="text-xs text-white/50">{new Date(action.created_at).toLocaleString()}</time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">{action.reason}</p>
                {action.action_type === "mute" && action.restriction_ends_at && (
                  <p className="mt-2 text-xs text-white/55">
                    Posting restriction ends {new Date(action.restriction_ends_at).toLocaleString()}.
                  </p>
                )}
                <p className="mt-2 text-xs text-white/45">Issued by {action.moderator}</p>
                {action.appeal ? (
                  <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-sm font-semibold capitalize">Appeal {action.appeal.status}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">{action.appeal.appeal_text}</p>
                    {action.appeal.resolution_note && (
                      <p className="mt-3 border-t border-white/10 pt-3 text-sm text-white/70">
                        {action.appeal.resolution_note}
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={(event) => void submitAppeal(event, action.id)} className="mt-4">
                    <label className="block text-sm font-semibold">
                      Appeal this decision
                      <textarea
                        required
                        minLength={10}
                        maxLength={3000}
                        value={appealTexts[action.id] ?? ""}
                        onChange={(event) =>
                          setAppealTexts((current) => ({ ...current, [action.id]: event.target.value }))
                        }
                        placeholder="Explain why you believe this decision should be reviewed."
                        className="mt-2 min-h-28 w-full resize-y rounded-lg border border-white/20 bg-black/40 p-3 font-normal"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={submittingId === action.id}
                      className="mt-3 rounded-lg border border-green-300/25 bg-green-300/10 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-green-300/20 disabled:opacity-50"
                    >
                      {submittingId === action.id ? "Sending…" : "Submit appeal"}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
