"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

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

export default function MemberModerationClient() {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [durationDays, setDurationDays] = useState(3);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingAppeals, setLoadingAppeals] = useState(true);
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
  }, []);

  useEffect(() => {
    loadAppeals()
      .catch((loadError) => {
        console.error("Could not load moderator workspace appeals", loadError);
        setError("Pending appeals could not be loaded.");
      })
      .finally(() => setLoadingAppeals(false));
  }, [loadAppeals]);

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
          subtitle="Issue community warnings and temporary posting mutes, and review appeals."
        />

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
          <p className="mt-2 text-xs text-white/50">Search returns regular member accounts only. Moderator and admin accounts are not listed.</p>

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

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-green-200">Pending appeals</h2>
          {loadingAppeals ? (
            <p role="status" className="mt-3 text-sm text-white/60">Loading appeals…</p>
          ) : appeals.length === 0 ? (
            <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
              No pending moderation appeals.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {appeals.map((appeal) => (
                <li key={appeal.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-semibold text-green-100">
                    @{appeal.appellant} · {appeal.actionType} · issued by {appeal.originalActor}
                  </p>
                  <p className="mt-2 text-xs text-white/50">
                    {new Date(appeal.created_at).toLocaleString()} · {appeal.actionReason}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">{appeal.appeal_text}</p>
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
    </main>
  );
}
