"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

interface Person {
  id: string;
  username: string;
  avatar_url?: string | null;
}

interface FriendData {
  allowFriendRequests: boolean;
  friends: (Person & { created_at: string })[];
  incoming: { id: string; person: Person }[];
  outgoing: { id: string; person: Person }[];
  blocked: Person[];
  discoverable: Person[];
}

export default function FriendsPage() {
  const router = useRouter();
  const [data, setData] = useState<FriendData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingAction, setPendingAction] = useState<{
    action: "remove" | "block";
    person: Person;
  } | null>(null);

  const load = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseBrowser.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      router.replace("/auth/login");
      return;
    }
    const response = await fetch("/api/community/friends", {
      cache: "no-store",
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load friends");
    setData(result);
  }, [router]);

  useEffect(() => {
    load()
      .catch((loadError) => {
        console.error("Could not load community friends", loadError);
        setError("Could not load friends and requests.");
      })
      .finally(() => setLoading(false));
  }, [load]);

  async function perform(action: string, values: Record<string, unknown> = {}) {
    setBusyId(String(values.userId || values.requestId || action));
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/community/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, ...values }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not complete action");
      setSuccess(
        action === "request"
          ? "Friend request sent."
          : action === "privacy"
            ? "Friend request privacy saved."
            : "Updated."
      );
      await load();
      return true;
    } catch (actionError) {
      console.error("Could not update community friends", actionError);
      setError(actionError instanceof Error ? actionError.message : "Could not complete action.");
      return false;
    } finally {
      setBusyId("");
    }
  }

  const discoverable = (data?.discoverable ?? []).filter((person) =>
    person.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white">
        Loading friends…
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto w-full max-w-3xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute right-4 top-4 z-40">
          <MenuOverlay current="friends" />
        </div>
        <PageHeading
          title="Friends"
          subtitle="Manage friend requests, find brewers, and control who can contact you."
        />
        {error && <p role="alert" className="mb-4 text-sm text-amber-300">{error}</p>}
        {success && <p role="status" className="mb-4 text-sm text-green-300">{success}</p>}

        {data && (
          <div className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm">
              <strong className="block">Accept friend requests</strong>
              <span className="text-white/60">
                Turn this off to stop new requests and remove yourself from the Find brewers list.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={data.allowFriendRequests}
              aria-label="Accept friend requests"
              disabled={busyId === "privacy"}
              onClick={() =>
                perform("privacy", {
                  allowFriendRequests: !data.allowFriendRequests,
                })
              }
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-wait disabled:opacity-50 ${
                data.allowFriendRequests
                  ? "border-green-500 bg-green-600"
                  : "border-white/20 bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  data.allowFriendRequests ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-green-300">
            Incoming requests {data?.incoming.length ? `(${data.incoming.length})` : ""}
          </h2>
          {data?.incoming.length ? (
            <ul className="space-y-2">
              {data.incoming.map(({ id, person }) => (
                <li key={id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
                  <PersonLink person={person} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!!busyId}
                      onClick={() => perform("respond", { requestId: id, reason: "accept" })}
                      className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold hover:bg-green-600 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={!!busyId}
                      onClick={() => perform("respond", { requestId: id, reason: "decline" })}
                      className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-white/55">No incoming requests.</p>}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-green-300">Your friends</h2>
          {data?.friends.length ? (
            <ul className="space-y-2">
              {data.friends.map((person) => (
                <li key={person.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
                  <PersonLink person={person} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/community/messages?peer_id=${person.id}`)}
                      className="rounded-lg border border-green-500/40 bg-green-800/50 px-3 py-2 text-sm font-semibold hover:bg-green-700"
                    >
                      Message
                    </button>
                    <button
                      type="button"
                      disabled={!!busyId}
                      onClick={() => setPendingAction({ action: "remove", person })}
                      className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
                    >
                      Unfriend
                    </button>
                    <button
                      type="button"
                      disabled={!!busyId}
                      onClick={() => setPendingAction({ action: "block", person })}
                      className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-200 hover:bg-red-950/50 disabled:opacity-50"
                    >
                      Block
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-white/55">No friends yet.</p>}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-green-300">Sent requests</h2>
          {data?.outgoing.length ? (
            <ul className="space-y-2">
              {data.outgoing.map(({ id, person }) => (
                <li key={id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
                  <PersonLink person={person} />
                  <button
                    type="button"
                    disabled={!!busyId}
                    onClick={() => perform("cancel", { requestId: id })}
                    className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
                  >
                    Cancel request
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-white/55">No sent requests.</p>}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-green-300">Find brewers</h2>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search public members"
            className="mb-3 w-full rounded-lg border border-white/20 bg-black/40 p-3"
          />
          <ul className="space-y-2">
            {discoverable.slice(0, 50).map((person) => (
              <li key={person.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
                <PersonLink person={person} />
                <button
                  type="button"
                  disabled={!!busyId}
                  onClick={() => perform("request", { userId: person.id })}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                >
                  Add friend
                </button>
              </li>
            ))}
            {discoverable.length === 0 && (
              <li className="py-3 text-center text-sm text-white/55">No members found.</li>
            )}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-green-300">Blocked users</h2>
          {data?.blocked.length ? (
            <ul className="space-y-2">
              {data.blocked.map((person) => (
                <li key={person.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
                  <PersonLink person={person} />
                  <button
                    type="button"
                    disabled={!!busyId}
                    onClick={() => perform("unblock", { userId: person.id })}
                    className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-white/55">No blocked users.</p>}
        </section>
      </div>
      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction?.action === "block" ? "Block this user?" : "Unfriend this user?"}
        message={
          pendingAction?.action === "block"
            ? `${pendingAction.person.username} will be removed from your friends, and neither of you will be able to message or send friend requests to the other.`
            : `Remove ${pendingAction?.person.username} from your friends? Your conversation history will be kept, but messaging stops until you become friends again.`
        }
        confirmLabel={pendingAction?.action === "block" ? "Block user" : "Unfriend"}
        onConfirm={async () => {
          if (!pendingAction) return false;
          return perform(pendingAction.action, { userId: pendingAction.person.id });
        }}
        onCancel={() => setPendingAction(null)}
      />
    </main>
  );
}

function PersonLink({ person }: { person: Person }) {
  return (
    <Link href={`/members/${encodeURIComponent(person.username)}`} className="flex min-w-0 items-center gap-3">
      <img
        src={person.avatar_url || "/default-avatar.png"}
        alt=""
        className="h-10 w-10 rounded-full border border-white/20 object-cover"
      />
      <span className="truncate font-medium">{person.username}</span>
    </Link>
  );
}
