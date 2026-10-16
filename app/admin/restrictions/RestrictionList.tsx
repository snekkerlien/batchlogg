"use client";

import { useState } from "react";
import Link from "next/link";

interface Restriction {
  user_id: string;
  restriction_type: "mute" | "ban";
  starts_at: string;
  ends_at: string | null;
  reason: string | null;
  username: string;
}

export default function RestrictionList({
  initialRestrictions,
}: {
  initialRestrictions: Restriction[];
}) {
  const [restrictions, setRestrictions] = useState(initialRestrictions);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function removeRestriction(restriction: Restriction) {
    const key = `${restriction.user_id}:${restriction.restriction_type}`;
    if (busyKey) return;
    setBusyKey(key);
    setError("");
    try {
      const response = await fetch("/api/admin/restrictions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: restriction.user_id,
          type: restriction.restriction_type,
        }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not remove restriction");
      setRestrictions((current) =>
        current.filter(
          (item) =>
            item.user_id !== restriction.user_id ||
            item.restriction_type !== restriction.restriction_type
        )
      );
    } catch (removeError) {
      console.error("Could not remove user restriction", removeError);
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove restriction."
      );
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section aria-label="Active user restrictions">
      {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
      {restrictions.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
          There are no active mutes or bans.
        </p>
      ) : (
        <ul className="space-y-3">
          {restrictions.map((restriction) => {
            const key = `${restriction.user_id}:${restriction.restriction_type}`;
            return (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/members/${encodeURIComponent(restriction.username)}`}
                    className="font-semibold text-green-300 hover:underline"
                  >
                    {restriction.username}
                  </Link>
                  <p className="mt-1 text-sm text-white/75">
                    {restriction.restriction_type === "mute" ? "Muted" : "Banned from changes"}
                    {" · "}
                    {restriction.ends_at
                      ? `Until ${new Date(restriction.ends_at).toLocaleString("en-GB")}`
                      : "Indefinitely"}
                  </p>
                  {restriction.reason && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-white/55">
                      {restriction.reason}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void removeRestriction(restriction)}
                  disabled={busyKey !== null}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:cursor-wait disabled:opacity-50"
                >
                  {busyKey === key
                    ? "Removing…"
                    : restriction.restriction_type === "mute"
                      ? "Unmute"
                      : "Unban"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
