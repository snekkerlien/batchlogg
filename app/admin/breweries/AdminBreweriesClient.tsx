"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import { businessTypeLabel } from "@/lib/brewery/business";

type Account = {
  id: string;
  owner_id: string;
  owner_username: string;
  name: string;
  business_type: string;
  business_type_other: string | null;
  application_contact_name: string | null;
  application_business_email: string | null;
  application_offerings: string | null;
  application_referral_source: string | null;
  slug: string;
  description: string;
  location: string;
  website_url: string | null;
  status: string;
  manual_access_granted_at: string | null;
  manual_access_expires_at: string | null;
  manual_access_note: string | null;
  stripe_subscription_status: string | null;
  created_at: string;
};

type Report = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  review: { id: string; rating: number; title: string; body: string; status: string } | null;
  product: { name: string } | null;
  brewery: { name: string; slug: string } | null;
};

const buttonClass = "rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50";

export default function AdminBreweriesClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [grantExpiry, setGrantExpiry] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/breweries", { cache: "no-store", credentials: "include" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load business accounts.");
    setAccounts(data.accounts);
    setReports(data.reports);
  }, []);

  useEffect(() => {
    load().catch((loadError) => {
      console.error("Could not load brewery admin data", loadError);
      setError(loadError instanceof Error ? loadError.message : "Could not load business accounts.");
    }).finally(() => setLoading(false));
  }, [load]);

  async function update(body: Record<string, unknown>, id: string) {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/breweries", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update brewery.");
      await load();
      setNotice("Brewery account updated.");
    } catch (updateError) {
      console.error("Could not update business account", updateError);
      setError(updateError instanceof Error ? updateError.message : "Could not update brewery.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = accounts.filter((account) => account.status === "pending");
  const other = accounts.filter((account) => account.status !== "pending");

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto mt-8 max-w-5xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-9 sm:pt-16">
        <div className="absolute left-4 top-3 z-40"><BackButton /></div>
        <div className="absolute right-4 top-3 z-40"><MenuOverlay current="admin" /></div>
        <PageHeading title="Business accounts" subtitle="Review applications, grants, subscriptions, and reported product reviews." />
        {error && <p role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-950/40 p-3 text-red-200">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg border border-green-400/30 bg-green-950/40 p-3 text-green-200">{notice}</p>}
        {loading ? <p className="text-center text-white/60">Loading business accounts…</p> : (
          <div className="space-y-10">
            <section>
              <h2 className="mb-4 text-center text-xl font-semibold text-green-200">Pending applications ({pending.length})</h2>
              {pending.length === 0 ? <p className="text-center text-sm text-white/55">No applications awaiting review.</p> : <ul className="space-y-4">{pending.map((account) => (
                <li key={account.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold">{account.name}</h3>
                  <p className="text-sm text-green-200">{businessTypeLabel(account.business_type, account.business_type_other)}</p>
                  <p className="text-sm text-white/50">Owner: {account.owner_username} · {account.location || "No location"} · Applied {new Date(account.created_at).toLocaleDateString()}</p>
                  {account.application_contact_name && <p className="mt-2 text-sm text-white/70">Contact: {account.application_contact_name}{account.application_business_email ? <> · <a href={`mailto:${account.application_business_email}`} className="text-green-200 underline">{account.application_business_email}</a></> : null}</p>}
                  {account.application_offerings && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/75"><span className="font-semibold text-white">What they make or sell: </span>{account.application_offerings}</p>}
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/75">{account.description || "No description provided."}</p>
                  {account.application_referral_source && <p className="mt-2 text-xs text-white/50">Heard about Batchlogg via: {account.application_referral_source}</p>}
                  {account.website_url && <a href={account.website_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-green-200 underline">{account.website_url}</a>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button disabled={busyId === account.id} onClick={() => void update({ action: "approve", breweryId: account.id }, account.id)} className="rounded-lg border border-green-400/30 bg-green-700 px-4 py-2 font-semibold">Approve</button>
                    <button disabled={busyId === account.id} onClick={() => void update({ action: "reject", breweryId: account.id }, account.id)} className={buttonClass}>Reject</button>
                    <button disabled={busyId === account.id} onClick={() => void update({ action: "grant", breweryId: account.id, note: grantNote, expiresAt: grantExpiry }, account.id)} className={buttonClass}>Approve & grant free access</button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-white/55">Optional grant note<input maxLength={1000} value={grantNote} onChange={(event) => setGrantNote(event.target.value)} className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2 text-sm text-white" /></label>
                    <label className="text-xs text-white/55">Optional grant expiration<input type="datetime-local" value={grantExpiry} onChange={(event) => setGrantExpiry(event.target.value)} className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2 text-sm text-white" /></label>
                  </div>
                </li>
              ))}</ul>}
            </section>

            <section>
              <h2 className="mb-4 text-center text-xl font-semibold text-green-200">Existing business accounts ({other.length})</h2>
              {other.length === 0 ? <p className="text-center text-sm text-white/55">No other business accounts.</p> : <ul className="space-y-4">{other.map((account) => {
                const manualGrantActive = !!account.manual_access_granted_at && (!account.manual_access_expires_at || Date.parse(account.manual_access_expires_at) > Date.now());
                return (
                  <li key={account.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{account.name}</h3>
                        <p className="text-sm text-green-200">{businessTypeLabel(account.business_type, account.business_type_other)}</p>
                        <p className="mt-1 text-sm text-white/55">Owner: {account.owner_username} · /{account.slug} · <span className="capitalize">{account.status}</span></p>
                        <p className="mt-1 text-xs text-white/45">Stripe: {account.stripe_subscription_status || "no subscription"} · Manual grant: {manualGrantActive ? "active" : "none"}</p>
                        {account.manual_access_note && <p className="mt-2 text-sm text-white/60">Grant note: {account.manual_access_note}</p>}
                      </div>
                      {account.status === "approved" && <Link href={`/business/${account.slug}`} className="text-sm text-green-200 underline">Public page</Link>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {!manualGrantActive && <button disabled={busyId === account.id} onClick={() => void update({ action: "grant", breweryId: account.id, note: grantNote, expiresAt: grantExpiry }, account.id)} className={buttonClass}>Grant free access</button>}
                      {account.manual_access_granted_at && <button disabled={busyId === account.id} onClick={() => void update({ action: "revoke_grant", breweryId: account.id }, account.id)} className={buttonClass}>Revoke manual grant</button>}
                      {account.status === "approved" && <button disabled={busyId === account.id} onClick={() => void update({ action: "suspend", breweryId: account.id }, account.id)} className={buttonClass}>Suspend</button>}
                      {account.status === "suspended" && <button disabled={busyId === account.id} onClick={() => void update({ action: "approve", breweryId: account.id }, account.id)} className={buttonClass}>Restore</button>}
                      {account.status === "rejected" && <button disabled={busyId === account.id} onClick={() => void update({ action: "approve", breweryId: account.id }, account.id)} className={buttonClass}>Approve</button>}
                    </div>
                    {!manualGrantActive && <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs text-white/55">Optional grant note<input maxLength={1000} value={grantNote} onChange={(event) => setGrantNote(event.target.value)} className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2 text-sm text-white" /></label>
                      <label className="text-xs text-white/55">Optional grant expiration<input type="datetime-local" value={grantExpiry} onChange={(event) => setGrantExpiry(event.target.value)} className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2 text-sm text-white" /></label>
                    </div>}
                  </li>
                );
              })}</ul>}
            </section>

            <section>
              <h2 className="mb-4 text-center text-xl font-semibold text-green-200">Reported reviews ({reports.filter((report) => report.status === "open" || report.status === "under_review").length})</h2>
              {reports.filter((report) => report.status === "open" || report.status === "under_review").length === 0 ? <p className="text-center text-sm text-white/55">No open review reports.</p> : <ul className="space-y-4">{reports.filter((report) => report.status === "open" || report.status === "under_review").map((report) => (
                <li key={report.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-white/50">{report.brewery?.name || "Brewery"} · {report.product?.name || "Product"} · {new Date(report.created_at).toLocaleString()}</p>
                  <p className="mt-2 font-semibold">{report.review?.title || `${report.review?.rating ?? "?"} / 5`}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-white/75">{report.review?.body || "Review no longer available."}</p>
                  <p className="mt-3 text-sm text-amber-200">Report: {report.reason}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {report.status === "open" && <button onClick={() => void update({ action: "review", reportId: report.id, status: "under_review" }, report.id)} className={buttonClass}>Mark under review</button>}
                    <button onClick={() => void update({ action: "review", reportId: report.id, status: "action_taken" }, report.id)} className="rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-200">Hide review</button>
                    <button onClick={() => void update({ action: "review", reportId: report.id, status: "closed" }, report.id)} className={buttonClass}>Close report</button>
                  </div>
                </li>
              ))}</ul>}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
