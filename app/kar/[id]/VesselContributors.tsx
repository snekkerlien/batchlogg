"use client";

import { useCallback, useEffect, useState } from "react";

type Contributor = { id: string; username: string };
type Friend = { id: string; username: string };

export default function VesselContributors({ karId }: { karId: string }) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadContributors = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/kar/${karId}/contributors`, {
        credentials: "include",
        cache: "no-store",
      });
      const result: { contributors?: Contributor[]; error?: string } =
        await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load contributors.");
      setContributors(result.contributors ?? []);
    } catch (loadError) {
      console.error("Could not load vessel contributors", loadError);
      setError(
        loadError instanceof Error ? loadError.message : "Could not load contributors."
      );
    } finally {
      setLoading(false);
    }
  }, [karId]);

  useEffect(() => {
    void loadContributors();
  }, [loadContributors]);

  useEffect(() => {
    async function loadFriends() {
      setFriendsLoading(true);
      try {
        const response = await fetch("/api/community/friends", {
          credentials: "include",
          cache: "no-store",
        });
        const result: { friends?: Friend[]; error?: string } = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load friends.");
        setFriends(result.friends ?? []);
      } catch (loadError) {
        console.error("Could not load friends for vessel sharing", loadError);
        setError(
          loadError instanceof Error ? loadError.message : "Could not load friends."
        );
      } finally {
        setFriendsLoading(false);
      }
    }

    void loadFriends();
  }, []);

  async function addContributor(friend: Friend) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/kar/${karId}/contributors`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: friend.id }),
      });
      const result: { contributor?: Contributor; error?: string } =
        await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not add contributor.");
      const addedContributor = result.contributor;
      if (
        addedContributor &&
        !contributors.some((contributor) => contributor.id === addedContributor.id)
      ) {
        setContributors((current) => [...current, addedContributor]);
      }
      setMessage("Contributor added.");
    } catch (addError) {
      console.error("Could not add vessel contributor", addError);
      setError(
        addError instanceof Error ? addError.message : "Could not add contributor."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeContributor(contributor: Contributor) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/kar/${karId}/contributors`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: contributor.id }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not remove contributor.");
      setContributors((current) =>
        current.filter((currentContributor) => currentContributor.id !== contributor.id)
      );
      setMessage("Contributor removed.");
    } catch (removeError) {
      console.error("Could not remove vessel contributor", removeError);
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove contributor."
      );
    }
  }

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <section className="mb-8 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="mb-4 text-center text-sm text-zinc-300">
        Friends you add can manage batches, notes, and gravity readings. Only you
        can manage sharing or delete the vessel.
      </p>
      <div className="mx-auto mb-5 max-w-md">
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">Contributors</h3>
        {loading ? (
          <p className="text-sm text-zinc-400">Loading contributors…</p>
        ) : contributors.length === 0 ? (
          <p className="text-sm text-zinc-400">No contributors yet.</p>
        ) : (
          <ul className="space-y-2">
            {contributors.map((contributor) => (
              <li
                key={contributor.id}
                className="flex items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
              >
                <span>{contributor.username}</span>
                <button
                  type="button"
                  onClick={() => void removeContributor(contributor)}
                  className="text-sm text-red-300 hover:text-red-200"
                  aria-label={`Remove ${contributor.username} as contributor`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="mx-auto mb-3 block max-w-md">
        <span className="sr-only">Search your friends</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search your friends"
          placeholder="Search your friends"
          className="w-full rounded border border-white/20 bg-black/40 px-3 py-2"
        />
      </label>

      {error && <p role="alert" className="mt-3 text-center text-sm text-red-300">{error}</p>}
      {message && <p role="status" className="mt-3 text-center text-sm text-green-300">{message}</p>}

      <div className="mx-auto mt-4 max-w-md">
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">
          Friends
        </h3>
        {friendsLoading ? (
          <p className="text-sm text-zinc-400">Loading friends…</p>
        ) : friends.length === 0 ? (
          <p className="text-sm text-zinc-400">
            You need to add friends before you can share a vessel.
          </p>
        ) : filteredFriends.length === 0 ? (
          <p className="text-sm text-zinc-400">No friends match your search.</p>
        ) : (
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {filteredFriends.map((friend) => {
              const isContributor = contributors.some(
                (contributor) => contributor.id === friend.id
              );
              return (
                <li
                  key={friend.id}
                  className="flex items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
                >
                  <span>{friend.username}</span>
                  {isContributor ? (
                    <span className="text-sm text-green-300">Shared</span>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void addContributor(friend)}
                      className="text-sm font-semibold text-green-300 hover:text-green-200 disabled:opacity-60"
                    >
                      {saving ? "Adding…" : "Add"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </section>
  );
}
