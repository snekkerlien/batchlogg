"use client";

import { useCallback, useEffect, useState } from "react";

type Member = {
  id: string;
  username: string | null;
  email: string | null;
  role: string;
  createdAt: string;
};

const inputClass = "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white";

export default function BreweryTeamManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMembers = useCallback(async () => {
    const response = await fetch("/api/brewery/team", {
      cache: "no-store",
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load the business team.");
    setMembers(result.members);
  }, []);

  useEffect(() => {
    loadMembers()
      .catch((loadError) => {
        console.error("Could not load business team", loadError);
        setError(loadError instanceof Error ? loadError.message : "Could not load the business team.");
      })
      .finally(() => setLoading(false));
  }, [loadMembers]);

  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/brewery/team", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add the team member.");
      setIdentifier("");
      setNotice(
        result.invited
          ? `Invitation email sent to ${result.member.email}.`
          : `${result.member.username ? `@${result.member.username}` : result.member.email} was added to the team.`
      );
      await loadMembers();
    } catch (addError) {
      console.error("Could not add business team member", addError);
      setError(addError instanceof Error ? addError.message : "Could not add the team member.");
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(member: Member) {
    const label = member.username ? `@${member.username}` : member.email ?? "this person";
    if (!window.confirm(`Remove ${label} from the business team?`)) return;
    setRemovingId(member.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/brewery/team/${encodeURIComponent(member.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not remove the team member.");
      setMembers((current) => current.filter((person) => person.id !== member.id));
      setNotice(`${label} was removed from the team.`);
    } catch (removeError) {
      console.error("Could not remove business team member", removeError);
      setError(removeError instanceof Error ? removeError.message : "Could not remove the team member.");
    } finally {
      setRemovingId(null);
    }
  }

  async function updateRole(member: Member, role: string) {
    if (role === member.role) return;
    setUpdatingRoleId(member.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/brewery/team/${encodeURIComponent(member.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update the team member role.");
      setMembers((current) =>
        current.map((person) => person.id === member.id ? { ...person, role: result.role } : person)
      );
      setNotice(`${member.username ? `@${member.username}` : member.email ?? "Teammate"} is now a ${role}.`);
    } catch (updateError) {
      console.error("Could not update business team member role", updateError);
      setError(updateError instanceof Error ? updateError.message : "Could not update the team member role.");
    } finally {
      setUpdatingRoleId(null);
    }
  }

  return (
    <section id="business-team" className="scroll-mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-xl font-semibold text-green-200">Team</h2>
      <p className="mt-1 text-sm leading-6 text-white/65">
        Add teammates by Batchlogg username or email. New email addresses receive an invitation.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <dt className="font-semibold text-white/90">Owner</dt>
          <dd className="mt-1 text-sm leading-5 text-white/60">Controls billing and team access, and can edit the business page, products, and analytics.</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <dt className="font-semibold text-white/90">Manager</dt>
          <dd className="mt-1 text-sm leading-5 text-white/60">Can edit the business page, manage products, and view analytics. Cannot manage billing or teammates.</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <dt className="font-semibold text-white/90">Editor</dt>
          <dd className="mt-1 text-sm leading-5 text-white/60">Can manage products and view analytics. Cannot edit the business page, billing, or team access.</dd>
        </div>
      </dl>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/30 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg border border-green-400/30 bg-green-950/40 p-3 text-sm text-green-200">{notice}</p>}

      <form onSubmit={addMember} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1 text-sm">
          Username or email
          <input
            required
            maxLength={254}
            autoComplete="off"
            className={inputClass}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="username or name@example.com"
          />
        </label>
        <button
          type="submit"
          disabled={saving || !identifier.trim()}
          className="rounded-lg border border-green-300/30 bg-green-700/70 px-4 py-2 font-semibold text-white hover:bg-green-600/80 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add teammate"}
        </button>
      </form>

      <div className="mt-6 border-t border-white/10 pt-4">
        <h3 className="text-sm font-semibold text-white/80">Current teammates</h3>
        {loading ? (
          <p className="mt-3 text-sm text-white/55">Loading team…</p>
        ) : members.length ? (
          <ul className="mt-2 divide-y divide-white/10">
            {members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2">
                <div className="flex min-w-0 flex-1 items-baseline gap-x-2">
                  <p className="truncate text-sm font-medium">{member.username ? `@${member.username}` : member.email ?? "Batchlogg member"}</p>
                  {member.username && member.email && <p className="truncate text-xs text-white/45">{member.email}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-white/55">
                    Role
                    <select
                      value={member.role}
                      disabled={updatingRoleId === member.id}
                      onChange={(event) => void updateRole(member, event.target.value)}
                      className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      <option value="manager" className="bg-zinc-900">Manager</option>
                      <option value="editor" className="bg-zinc-900">Editor</option>
                    </select>
                  </label>
                  {updatingRoleId === member.id && (
                    <span aria-live="polite" className="text-xs text-white/50">Saving…</span>
                  )}
                  <button
                    type="button"
                    disabled={removingId === member.id}
                    onClick={() => void removeMember(member)}
                    className="rounded-md border border-red-300/20 px-2.5 py-1 text-xs text-red-200 hover:bg-red-950/40 disabled:opacity-50"
                  >
                    {removingId === member.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-white/55">No teammates yet. You’re the only person with access.</p>
        )}
      </div>
    </section>
  );
}
