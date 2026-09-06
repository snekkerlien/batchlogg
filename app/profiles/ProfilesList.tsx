"use client";

import { useState } from "react";
import Link from "next/link";

export default function ProfilesList({ profiles }: { profiles: any[] }) {
  const [search, setSearch] = useState("");

  const filtered = profiles.filter((p) =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* SØKEFELT – nå midtstilt */}
      <div className="w-full flex justify-center mb-6">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xl px-4 py-3 rounded-lg bg-black/40 border border-white/20 text-white"
        />
      </div>

      <div className="max-w-xl mx-auto space-y-4">
        {filtered.length > 0 ? (
          filtered.map((p) => (
            <Link
              key={p.id}
              href={`/profiles/${p.username}`}
              className="flex items-center justify-center gap-4 border border-white/10 bg-white/5 hover:bg-white/10 transition rounded-xl p-4"
            >
              <img
                src={
                  p.avatar_url && p.avatar_url.length > 5
                    ? p.avatar_url
                    : "/default-avatar.png"
                }
                className="w-12 h-12 rounded-full object-cover object-center overflow-hidden border border-white/20"
              />

              <span className="font-semibold">
                {p.username
                  ? p.username.charAt(0).toUpperCase() + p.username.slice(1)
                  : "Unknown user"}
              </span>
            </Link>
          ))
        ) : (
          <p className="opacity-60 text-center">No public users found.</p>
        )}
      </div>
    </>
  );
}
