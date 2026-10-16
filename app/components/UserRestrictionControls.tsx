"use client";

import { FormEvent, useState } from "react";

export interface UserRestriction {
  user_id: string;
  restriction_type: "mute" | "ban";
  starts_at: string;
  ends_at: string | null;
  reason: string | null;
}

export default function UserRestrictionControls({
  userId,
  restrictions: initialRestrictions,
}: {
  userId: string;
  restrictions: UserRestriction[];
}) {
  const [restrictions, setRestrictions] = useState(initialRestrictions);
  const [restrictionType, setRestrictionType] = useState<"mute" | "ban">("mute");
  const [duration, setDuration] = useState("7");
  const [indefinite, setIndefinite] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function applyRestriction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const days = Number(duration);
    if (!indefinite && (!Number.isInteger(days) || days < 1 || days > 36500)) {
      setError("Enter a duration between 1 and 36500 days, or choose indefinite.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/restrictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          type: restrictionType,
          durationDays: indefinite ? null : days,
          reason,
        }),
      });
      const result: {
        error?: string;
        restriction?: UserRestriction;
      } = await response.json();
      if (!response.ok || !result.restriction) {
        throw new Error(result.error || "Could not apply restriction");
      }

      const savedRestriction = result.restriction;
      setRestrictions((current) => [
        ...current.filter(
          (item) => item.restriction_type !== savedRestriction.restriction_type
        ),
        savedRestriction,
      ]);
      setSuccess(
        `${restrictionType === "mute" ? "Mute" : "Ban"} applied ${
          indefinite ? "indefinitely" : `for ${days} day${days === 1 ? "" : "s"}`
        }.`
      );
      setReason("");
    } catch (applyError) {
      console.error("Could not apply user restriction", applyError);
      setError(
        applyError instanceof Error ? applyError.message : "Could not apply restriction."
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeRestriction(type: "mute" | "ban") {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/restrictions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, type }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not remove restriction");
      setRestrictions((current) =>
        current.filter((item) => item.restriction_type !== type)
      );
      setSuccess(`${type === "mute" ? "Mute" : "Ban"} removed.`);
    } catch (removeError) {
      console.error("Could not remove user restriction", removeError);
      setError(
        removeError instanceof Error ? removeError.message : "Could not remove restriction."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 border-t border-white/10 pt-6">
      <h3 className="text-base font-semibold text-green-300">Mute or ban</h3>
      <div className="mt-3 space-y-2">
        {(["mute", "ban"] as const).map((type) => {
          const restriction = restrictions.find((item) => item.restriction_type === type);
          return (
            <div
              key={type}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3"
            >
              <p className="text-sm text-white/75">
                {type === "mute" ? "Community mute" : "Write ban"}
                {restriction && (
                  <span className="ml-2 text-white/50">
                    {restriction.ends_at
                      ? `until ${new Date(restriction.ends_at).toLocaleString("en-GB")}`
                      : "indefinite"}
                  </span>
                )}
              </p>
              {restriction && (
                <button
                  type="button"
                  onClick={() => void removeRestriction(type)}
                  disabled={busy}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 disabled:cursor-wait disabled:opacity-50"
                >
                  {type === "mute" ? "Unmute" : "Unban"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={applyRestriction} className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-white/80">
          Restriction
          <select
            value={restrictionType}
            onChange={(event) =>
              setRestrictionType(event.target.value === "ban" ? "ban" : "mute")
            }
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
          >
            <option value="mute">Mute from community actions</option>
            <option value="ban">Ban from making changes</option>
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={indefinite}
            onChange={(event) => setIndefinite(event.target.checked)}
            className="h-4 w-4 accent-green-600"
          />
          Indefinitely
        </label>
        {!indefinite && (
          <label className="block text-sm font-medium text-white/80">
            Duration in days
            <input
              type="number"
              min={1}
              max={36500}
              step={1}
              required
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
            />
          </label>
        )}
        <label className="block text-sm font-medium text-white/80">
          Reason (optional)
          <textarea
            maxLength={500}
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {success && <p role="status" className="text-sm text-green-300">{success}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:cursor-wait disabled:opacity-50"
        >
          {busy ? "Saving…" : `Apply ${restrictionType}`}
        </button>
      </form>
    </div>
  );
}
