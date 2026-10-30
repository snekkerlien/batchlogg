"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import BanAppealActions from "./BanAppealActions";

interface Member {
  id: string;
  username: string | null;
  activeMute: { ends_at: string | null; reason: string | null } | null;
}

interface Appeal {
  id: string;
  appeal_text: string;
  created_at: string;
  appellant: string;
  actionType: string;
  actionReason: string;
  originalActor: string;
  canReview: boolean;
}

interface BanAppealMessage {
  id: string;
  sender_role: "user" | "admin";
  message: string;
  created_at: string;
}

interface BanAppeal {
  user_id: string;
  username: string | null;
  banReason: string | null;
  status: "pending" | "info_requested" | "granted" | "dismissed";
  created_at: string;
  updated_at: string;
  messages: BanAppealMessage[];
}

export default function MemberModerationClient() {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [banAppeals, setBanAppeals] = useState<BanAppeal[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [durationDays, setDurationDays] = useState(3);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [appealsOpen, setAppealsOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingAppeals, setLoadingAppeals] = useState(true);
  const [loadingBanAppeals, setLoadingBanAppeals] = useState(true);
  const [appealsLoadError, setAppealsLoadError] = useState("");
  const [banAppealsLoadError, setBanAppealsLoadError] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAppeals = useCallback(async () => {
    const response = await fetch("/api/admin/moderation/members?view=appeals", {
      credentials: "include",
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load pending appeals.");
    setAppeals(data.appeals ?? []);
    setAppealsLoadError("");
    setError((current) =>
      current === "Community moderation appeals could not be loaded." ? "" : current
    );
  }, []);

  const loadBanAppeals = useCallback(async () => {
    const response = await fetch("/api/admin/moderation/members?view=ban-appeals", {
      credentials: "include",
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load ban appeals.");
    setBanAppeals(data.appeals ?? []);
    setBanAppealsLoadError("");
    setError((current) =>
      current === "Ban appeals could not be loaded." ? "" : current
    );
  }, []);

  useEffect(() => {
    loadAppeals()
      .catch((loadError) => {
        console.error("Could not load moderator workspace appeals", loadError);
        setAppealsLoadError("Community moderation appeals could not be loaded.");
        setError("Community moderation appeals could not be loaded.");
      })
      .finally(() => setLoadingAppeals(false));
    loadBanAppeals()
      .catch((loadError) => {
        console.error("Could not load ban appeals in moderator workspace", loadError);
        setBanAppealsLoadError("Ban appeals could not be loaded.");
        setError("Ban appeals could not be loaded.");
      })
      .finally(() => setLoadingBanAppeals(false));
  }, [loadAppeals, loadBanAppeals]);

  useEffect(() => {
    if (!appealsOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAppealsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [appealsOpen]);

  const searchMemberList = useCallback(async (search: string) => {
    if (search.trim().length < 2) {
      setMembers([]);
      return;
    }
    const response = await fetch(
      `/api/admin/moderation/members?q=${encodeURIComponent(search.trim())}`,
      { credentials: "include", cache: "no-store" }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not search members.");
    setMembers(data.members ?? []);
  }, []);

  async function searchMembers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2) {
      setMembers([]);
      return;
    }
    setLoadingMembers(true);
    setError("");
    try {
      await searchMemberList(query);
    } catch (searchError) {
      console.error("Could not search members for moderation", searchError);
      setError(searchError instanceof Error ? searchError.message : "Could not search members.");
    } finally {
      setLoadingMembers(false);
    }
  }

  async function moderateMember(member: Member, action: "warning" | "mute") {
    setSavingKey(`${member.id}:${action}`);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/moderation/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          memberId: member.id,
          action,
          reason: reason[member.id]?.trim() ?? "",
          ...(action === "mute" ? { durationDays } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not apply moderation action.");
      setNotice(`${action === "warning" ? "Warning issued" : "Posting mute applied"} for @${member.username}.`);
      setReason((current) => ({ ...current, [member.id]: "" }));
      await searchMemberList(query);
      await loadAppeals();
    } catch (actionError) {
      console.error("Could not moderate community member", actionError);
      setError(actionError instanceof Error ? actionError.message : "Could not apply moderation action.");
    } finally {
      setSavingKey("");
    }
  }

  async function resolveAppeal(appeal: Appeal, status: "upheld" | "overturned") {
    setSavingKey(appeal.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/moderation/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appealId: appeal.id,
          status,
          resolutionNote: resolutionNotes[appeal.id]?.trim() ?? "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not resolve appeal.");
      setNotice("Appeal decision saved.");
      await loadAppeals();
    } catch (resolveError) {
      console.error("Could not resolve member moderation appeal", resolveError);
      setError(resolveError instanceof Error ? resolveError.message : "Could not resolve appeal.");
    } finally {
      setSavingKey("");
    }
  }

  const pendingAppealCount =
    appeals.length + banAppeals.filter((appeal) => appeal.status === "pending").length;

  return (
    <main className="min-h-screen px-3 py-12 text-white sm:px-6">
      <div className="relative mx-auto mt-12 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-4 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute left-4 top-4">
          <BackButton />
        </div>
        <div className="absolute right-4 top-4">
          <MenuOverlay current="admin" />
        </div>
        <PageHeading
          title="Member moderation"
          subtitle="Issue community warnings and temporary posting mutes, and review member appeals."
        />
        <div className="mb-6 flex justify-center">
          <button
            type="button"
            onClick={() => setAppealsOpen(true)}
            aria-label={`Appeals, ${pendingAppealCount} pending`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 font-semibold transition-colors hover:border-white/25 hover:bg-white/10"
          >
            <span>Appeals</span>
            {pendingAppealCount > 0 && (
              <span
                aria-hidden="true"
                className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500/15 px-1.5 text-xs font-bold tabular-nums text-rose-200 ring-1 ring-inset ring-rose-400/30 shadow-[0_0_12px_rgba(251,113,133,0.16)]"
              >
                {pendingAppealCount > 99 ? "99+" : pendingAppealCount}
              </span>
            )}
          </button>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-900/30 p-3 text-sm text-red-100">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg border border-green-400/30 bg-green-900/20 p-3 text-sm text-green-100">{notice}</p>}

        <section className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-green-200">Find a member</h2>
          <form onSubmit={(event) => void searchMembers(event)} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Search member username</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                minLength={2}
                maxLength={50}
                placeholder="Search by username"
                className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
              />
            </label>
            <button
              type="submit"
              disabled={loadingMembers || query.trim().length < 2}
              className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20 disabled:opacity-50"
            >
              {loadingMembers ? "Searching…" : "Search members"}
            </button>
          </form>
          <p className="mt-2 text-xs text-white/50">Search returns regular member accounts only. Moderator, admin, and Developer accounts are not listed.</p>

          {members.length > 0 && (
            <ul className="mt-4 space-y-3">
              {members.map((member) => (
                <li key={member.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <h3 className="font-semibold text-green-100">@{member.username || "member"}</h3>
                  {member.activeMute && (
                    <p className="mt-2 text-xs text-amber-100/80">
                      Active posting mute
                      {member.activeMute.ends_at
                        ? ` until ${new Date(member.activeMute.ends_at).toLocaleString()}`
                        : ""}
                      {member.activeMute.reason ? ` · ${member.activeMute.reason}` : ""}
                    </p>
                  )}
                  <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-white/55">
                    Action reason
                    <textarea
                      value={reason[member.id] ?? ""}
                      onChange={(event) =>
                        setReason((current) => ({ ...current, [member.id]: event.target.value }))
                      }
                      minLength={3}
                      maxLength={500}
                      placeholder="Record why this action is appropriate"
                      className="mt-2 min-h-20 w-full resize-y rounded-lg border border-white/15 bg-black/40 p-3 text-sm normal-case"
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={Boolean(savingKey) || !reason[member.id]?.trim()}
                      onClick={() => void moderateMember(member, "warning")}
                      className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/20 disabled:opacity-40"
                    >
                      Issue warning
                    </button>
                    <label className="flex items-center gap-2 text-sm text-white/70">
                      Mute for
                      <select
                        value={durationDays}
                        onChange={(event) => setDurationDays(Number(event.target.value))}
                        className="rounded-lg border border-white/20 bg-black/50 px-2 py-2 text-white"
                      >
                        {[1, 3, 7, 14].map((days) => <option key={days} value={days}>{days} days</option>)}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={Boolean(savingKey) || !reason[member.id]?.trim() || Boolean(member.activeMute)}
                      onClick={() => void moderateMember(member, "mute")}
                      className="rounded-lg border border-orange-300/25 bg-orange-300/10 px-3 py-2 text-sm font-semibold text-orange-100 hover:bg-orange-300/20 disabled:opacity-40"
                    >
                      Apply posting mute
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!loadingMembers && query.trim().length >= 2 && members.length === 0 && (
            <p className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-center text-sm text-white/60">
              No regular members matched that username.
            </p>
          )}
        </section>

      </div>

      {appealsOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAppealsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="moderation-appeals-title"
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/15 bg-zinc-900 shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b border-white/10 p-4 sm:p-6">
              <div>
                <h2 id="moderation-appeals-title" className="text-xl font-semibold text-green-200">
                  Appeals
                </h2>
                <p className="mt-1 text-sm text-white/55">Ban appeals and community moderation appeals.</p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setAppealsOpen(false)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
              >
                Close
              </button>
            </header>
            <div className="overflow-y-auto p-4 sm:p-6">
              {error && error !== appealsLoadError && error !== banAppealsLoadError && (
                <p role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-900/30 p-3 text-sm text-red-100">
                  {error}
                </p>
              )}
              <section aria-labelledby="ban-appeals-title">
                <h3 id="ban-appeals-title" className="text-lg font-semibold text-green-100">
                  Ban appeals
                </h3>
                {loadingBanAppeals ? (
                  <p role="status" className="mt-3 text-sm text-white/60">Loading ban appeals…</p>
                ) : banAppealsLoadError ? (
                  <p role="alert" className="mt-3 text-sm text-red-300">{banAppealsLoadError}</p>
                ) : banAppeals.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
                    No ban appeals.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {banAppeals.map((appeal) => {
                      const initialPlea = appeal.messages.find(
                        (message) => message.sender_role === "user"
                      );
                      return (
                      <li key={appeal.user_id} className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 font-semibold text-red-200">
                            Ban appeal · {appeal.status.replace("_", " ")}
                          </span>
                          <time className="text-xs text-white/50">
                            Updated {new Date(appeal.updated_at).toLocaleString("en-GB")}
                          </time>
                        </div>
                        <p className="mt-3 text-sm text-white/60">
                          From{" "}
                          <Link
                            href={`/admin/users/${appeal.user_id}`}
                            className="text-white/85 underline"
                          >
                            {appeal.username ?? appeal.user_id}
                          </Link>
                        </p>
                        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-white/55">
                            Ban reason
                          </h4>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">
                            {appeal.banReason || "No ban reason was recorded."}
                          </p>
                        </div>
                        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-white/55">
                            User&apos;s plea
                          </h4>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">
                            {initialPlea?.message ?? "No appeal text was recorded."}
                          </p>
                        </div>
                        <ol className="mt-3 space-y-3">
                          {appeal.messages
                            .filter((message) => message.id !== initialPlea?.id)
                            .map((message) => (
                              <li
                                key={message.id}
                                className={`rounded-lg border p-3 ${
                                  message.sender_role === "admin"
                                    ? "border-amber-300/20 bg-amber-950/20"
                                    : "border-white/10 bg-black/20"
                                }`}
                              >
                                <div className="flex flex-wrap justify-between gap-2 text-xs text-white/50">
                                  <span>{message.sender_role === "admin" ? "Admin request" : "User reply"}</span>
                                  <time>{new Date(message.created_at).toLocaleString("en-GB")}</time>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm">{message.message}</p>
                              </li>
                            ))}
                        </ol>
                        <BanAppealActions
                          userId={appeal.user_id}
                          status={appeal.status}
                          onUpdated={() => {
                            void loadBanAppeals();
                          }}
                        />
                      </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section aria-labelledby="community-appeals-title" className="mt-8">
                <h3 id="community-appeals-title" className="text-lg font-semibold text-green-100">
                  Community moderation appeals
                </h3>
                {loadingAppeals ? (
                  <p role="status" className="mt-3 text-sm text-white/60">Loading moderation appeals…</p>
                ) : appealsLoadError ? (
                  <p role="alert" className="mt-3 text-sm text-red-300">{appealsLoadError}</p>
                ) : appeals.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
                    No pending community moderation appeals.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {appeals.map((appeal) => (
                      <li key={appeal.id} className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
                        <p className="text-sm font-semibold text-green-100">
                          @{appeal.appellant} · {appeal.actionType} · issued by {appeal.originalActor}
                        </p>
                        <p className="mt-2 text-xs text-white/50">
                          {new Date(appeal.created_at).toLocaleString()}
                        </p>
                        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-white/55">
                            {appeal.actionType} reason
                          </h4>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">
                            {appeal.actionReason || "No reason was recorded."}
                          </p>
                        </div>
                        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-white/55">
                            User&apos;s appeal
                          </h4>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">
                            {appeal.appeal_text}
                          </p>
                        </div>
                        {appeal.canReview ? (
                          <>
                            <textarea
                              value={resolutionNotes[appeal.id] ?? ""}
                              onChange={(event) =>
                                setResolutionNotes((current) => ({ ...current, [appeal.id]: event.target.value }))
                              }
                              minLength={3}
                              maxLength={1000}
                              placeholder="Decision note for the member"
                              className="mt-3 min-h-16 w-full resize-y rounded-lg border border-white/15 bg-black/40 p-3 text-sm"
                            />
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={Boolean(savingKey) || !resolutionNotes[appeal.id]?.trim()}
                                onClick={() => void resolveAppeal(appeal, "upheld")}
                                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-40"
                              >
                                Uphold action
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(savingKey) || !resolutionNotes[appeal.id]?.trim()}
                                onClick={() => void resolveAppeal(appeal, "overturned")}
                                className="rounded-lg border border-green-300/25 bg-green-300/10 px-3 py-2 text-sm font-semibold text-green-100 hover:bg-green-300/20 disabled:opacity-40"
                              >
                                Overturn action
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="mt-3 text-xs text-amber-100/70">
                            This decision must be reviewed by a different moderator or an administrator.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
