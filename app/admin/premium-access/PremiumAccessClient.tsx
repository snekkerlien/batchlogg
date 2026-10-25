"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { membershipLabel } from "@/lib/auth/membership";
import type { PremiumAccessSource } from "@/lib/auth/permissions";

export type PremiumAccessUser = {
  id: string;
  username: string;
  email: string;
  membership_status: string;
  account_tier: string;
  premium_grant_source: string | null;
  stripe_subscription_status: string | null;
  stripe_current_period_end: string | null;
  sources: PremiumAccessSource[];
};

const SOURCE_LABELS: Record<PremiumAccessSource, string> = {
  manual: "Manual grant",
  subscription: "Subscription",
  role: "Role-based",
};

const FILTERS: Array<{ value: PremiumAccessSource | "all"; label: string }> = [
  { value: "all", label: "All access" },
  { value: "manual", label: "Manual grant" },
  { value: "subscription", label: "Subscription-based" },
  { value: "role", label: "Role-based" },
];

export default function PremiumAccessClient({
  users,
}: {
  users: PremiumAccessUser[];
}) {
  const [sourceFilter, setSourceFilter] = useState<
    PremiumAccessSource | "all"
  >("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(
    () => ({
      all: users.length,
      manual: users.filter((user) => user.sources.includes("manual")).length,
      subscription: users.filter((user) =>
        user.sources.includes("subscription")
      ).length,
      role: users.filter((user) => user.sources.includes("role")).length,
    }),
    [users]
  );
  const visibleUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users
      .filter(
        (user) =>
          sourceFilter === "all" || user.sources.includes(sourceFilter)
      )
      .filter(
        (user) =>
          !query ||
          user.username.toLocaleLowerCase().includes(query) ||
          user.email.toLocaleLowerCase().includes(query)
      )
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [search, sourceFilter, users]);

  return (
    <section aria-label="Premium access users" className="space-y-5">
      <div className="flex flex-col gap-4">
        <label className="block text-sm font-medium text-white/75">
          Search users
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Username or email"
            className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-white placeholder:text-white/40 sm:max-w-md"
          />
        </label>
        <div>
          <p className="mb-2 text-sm font-medium text-white/75">
            Filter by access source
          </p>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={sourceFilter === filter.value}
                onClick={() => setSourceFilter(filter.value)}
                className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  sourceFilter === filter.value
                    ? "border-green-300/50 bg-green-500/20 text-green-100"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {filter.label}{" "}
                <span className="ml-1 text-xs text-white/55">
                  {counts[filter.value]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleUsers.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/65">
          {users.length === 0
            ? "No users currently have Premium access."
            : "No Premium users match this filter."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/55">
              <tr>
                <th scope="col" className="px-4 py-3">Account</th>
                <th scope="col" className="px-4 py-3">Role</th>
                <th scope="col" className="px-4 py-3">Access source</th>
                <th scope="col" className="px-4 py-3">Subscription status</th>
                <th scope="col" className="px-4 py-3">Period ends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {visibleUsers.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/users/${encodeURIComponent(user.id)}`}
                      className="font-semibold text-green-200 underline-offset-2 hover:underline"
                    >
                      {user.username}
                    </Link>
                    <p className="mt-1 break-all text-xs text-white/55">
                      {user.email || "No email"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-white/75">
                    {membershipLabel(user.membership_status)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.sources.map((source) => (
                        <span
                          key={source}
                          className="rounded-full border border-green-300/20 bg-green-300/10 px-2 py-1 text-xs text-green-100"
                        >
                          {SOURCE_LABELS[source]}
                          {source === "manual" &&
                            user.premium_grant_source !== "manual" &&
                            " (source not recorded)"}
                          {source === "role" &&
                            ` (${membershipLabel(user.membership_status)})`}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-white/75">
                    {user.premium_grant_source === "stripe"
                      ? user.stripe_subscription_status || "Unknown"
                      : "—"}
                  </td>
                  <td className="px-4 py-4 text-white/75">
                    {user.stripe_current_period_end
                      ? new Date(user.stripe_current_period_end).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-white/45">
        An account can qualify through more than one source. Subscription status
        is shown for Stripe-linked grants; access follows the current account
        tier and role.
      </p>
    </section>
  );
}
