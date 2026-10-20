"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import DeleteUserButton from "@/app/admin/users/[id]/DeleteUserButton";
import {
  MEMBERSHIP_STATUSES,
  isMembershipStatus,
  membershipLabel,
  type MembershipStatusValue,
} from "@/lib/auth/membership";
import UserRestrictionControls, {
  type UserRestriction,
} from "@/app/components/UserRestrictionControls";
import ExpandArrowButton from "@/app/components/ExpandArrowButton";

export interface MemberAdminDetails {
  email: string;
  can_manage_kegs: boolean;
  snus_is_true: boolean;
  account_tier: "free" | "premium";
  restrictions: UserRestriction[];
}

export default function MemberAdminActions({
  userId,
  username,
  details,
  membershipStatus,
}: {
  userId: string;
  username: string;
  details: MemberAdminDetails;
  membershipStatus: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(details.email);
  const [editedUsername, setEditedUsername] = useState(username);
  const [role, setRole] = useState<MembershipStatusValue>(
    isMembershipStatus(membershipStatus) ? membershipStatus : "member"
  );
  const [canManageKegs, setCanManageKegs] = useState(details.can_manage_kegs);
  const [snusIsTrue, setSnusIsTrue] = useState(details.snus_is_true);
  const [accountTier, setAccountTier] = useState<"free" | "premium">(details.account_tier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          username: editedUsername,
          membershipStatus: role,
          accountTier,
          canManageKegs,
          snusIsTrue,
        }),
      });
      const result: { error?: string; username?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save user changes");

      setSuccess("Account changes saved.");
      if (result.username && result.username !== username) {
        router.replace(`/members/${encodeURIComponent(result.username)}`);
      }
      router.refresh();
    } catch (saveError) {
      console.error("Could not save member admin changes", saveError);
      setError(
        saveError instanceof Error ? saveError.message : "Could not save user changes."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex w-full items-center justify-between gap-3 text-left">
        <h2 className="text-lg font-semibold text-green-200">Admin actions</h2>
        <ExpandArrowButton
          expanded={open}
          label="member admin actions"
          controls="member-admin-actions-content"
          onClick={() => setOpen((current) => !current)}
        />
      </div>
      <div
        id="member-admin-actions-content"
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <fieldset disabled={!open} className="mt-4 min-w-0 space-y-4 border-0 p-0">
      <form onSubmit={saveChanges} className="space-y-4">
        <label className="block text-sm font-medium text-white/80">
          Email
          <input
            type="email"
            required
            maxLength={320}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
          />
        </label>
        <label className="block text-sm font-medium text-white/80">
          Username
          <input
            required
            maxLength={64}
            value={editedUsername}
            onChange={(event) => setEditedUsername(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
          />
        </label>
        <label className="block text-sm font-medium text-white/80">
          Membership role
          <select
            value={role}
            onChange={(event) => {
              if (isMembershipStatus(event.target.value)) setRole(event.target.value);
            }}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
          >
            {MEMBERSHIP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {membershipLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-white/80">
          Plan tier
          <select
            value={accountTier}
            onChange={(event) => setAccountTier(event.target.value === "premium" ? "premium" : "free")}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
          >
            <option value="free">Free</option>
            <option value="premium">Premium (manual grant)</option>
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/80">
          <input
            type="checkbox"
            checked={canManageKegs}
            onChange={(event) => setCanManageKegs(event.target.checked)}
            className="h-4 w-4 accent-green-600"
          />
          Can manage kegs
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/80">
          <input
            type="checkbox"
            checked={snusIsTrue}
            onChange={(event) => setSnusIsTrue(event.target.checked)}
            className="h-4 w-4 accent-green-600"
          />
          Snus access
        </label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {success && <p role="status" className="text-sm text-green-300">{success}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg border border-green-400/30 bg-green-500/20 px-4 py-3 font-semibold text-green-200 transition hover:bg-green-500/30 disabled:cursor-wait disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save account changes"}
        </button>
      </form>
      <DeleteUserButton
        userId={userId}
        username={username}
        redirectTo="/members"
      />
      <UserRestrictionControls
        userId={userId}
        restrictions={details.restrictions}
      />
          </fieldset>
        </div>
      </div>
    </section>
  );
}
