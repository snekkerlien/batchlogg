"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { membershipLabel } from "@/lib/auth/membership";

type AdminUser = {
  id: string;
  email: string | undefined;
  created_at: string;
  username: string;
  avatar_url: string | null;
  is_public: boolean;
  membership_status: string;
  account_tier: "premium" | "free";
};

export default function AdminUsersList({ users }: { users: AdminUser[] }) {
  const [search, setSearch] = useState("");
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return users;

    return users.filter(
      (user) =>
        user.username.toLocaleLowerCase().includes(query) ||
        (user.email ?? "").toLocaleLowerCase().includes(query)
    );
  }, [search, users]);

  return (
    <section aria-label="User accounts" className="space-y-4">
      <label className="block text-sm font-medium text-white/75">
        Search users
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Username or email"
          className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-white placeholder:text-white/40"
        />
      </label>
      <p aria-live="polite" className="text-sm text-white/55">
        {filteredUsers.length} of {users.length} users
      </p>
      {filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
          {users.length === 0 ? "No users found." : "No users match your search."}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <Link
              key={user.id}
              href={`/admin/users/${user.id}`}
              className="group block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-green-400/30 hover:bg-white/10"
            >
              <div className="flex items-center gap-4">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-12 w-12 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60">
                    ?
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-green-300">
                    {user.username}
                  </p>
                  <p className="break-all text-sm text-white/80">
                    {user.email || "No email"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Created: {new Date(user.created_at).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {user.is_public ? "Public profile" : "Private profile"}
                  </p>
                  <p className="mt-1 text-sm text-green-200/75">
                    Role: {membershipLabel(user.membership_status)}
                  </p>
                  <p className="mt-1 text-sm text-green-200">
                    Tier: {user.account_tier === "premium" ? "Premium" : "Free"}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="ml-auto text-xl text-green-300 transition group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
