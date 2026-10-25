"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import BreweryTeamManager from "@/app/business/BreweryTeamManager";
import { BUSINESS_TYPES, businessTypeLabel } from "@/lib/brewery/business";

const inputClass = "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white";

type Account = {
  id: string;
  name: string;
  business_type: string;
  business_type_other: string | null;
  slug: string;
  description: string;
  location: string;
  website_url: string | null;
  logo_url: string | null;
  status: string;
  hasAccess: boolean;
  manual_access_granted_at: string | null;
  manual_access_expires_at: string | null;
  stripe_subscription_status: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  isOwner: boolean;
  role: string | null;
};

type BusinessOption = {
  id: string;
  name: string;
  slug: string;
  role: string | null;
  isOwner: boolean;
};

export default function BreweryManageClient() {
  const [account, setAccount] = useState<Account | null>(null);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [switchingBusiness, setSwitchingBusiness] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ text: string; warning: boolean } | null>(null);
  const [application, setApplication] = useState({
    name: "",
    businessType: "brewery",
    businessTypeOther: "",
    contactName: "",
    businessEmail: "",
    registrationNumber: "",
    verificationUrl: "",
    offerings: "",
    referralSource: "",
    description: "",
    location: "",
    websiteUrl: "",
  });
  const [page, setPage] = useState({
    name: "",
    businessType: "brewery",
    businessTypeOther: "",
    description: "",
    location: "",
    websiteUrl: "",
    logoUrl: "",
  });
  const load = useCallback(async () => {
    setLoadFailed(false);
    const response = await fetch("/api/brewery/me", {
      cache: "no-store",
      credentials: "include",
    });
    const data = await response.json();
    if (response.status === 401) setNeedsLogin(true);
    if (!response.ok) throw new Error(data.error || "Could not load business account.");
    setBusinesses(data.businesses ?? []);
    setAccount(data.account);
    if (data.account) {
      setPage({
        name: data.account.name,
        businessType: data.account.business_type,
        businessTypeOther: data.account.business_type_other ?? "",
        description: data.account.description,
        location: data.account.location,
        websiteUrl: data.account.website_url ?? "",
        logoUrl: data.account.logo_url ?? "",
      });
      setApplication((current) =>
        current.name
          ? current
          : {
              name: data.account.name,
              businessType: data.account.business_type,
              businessTypeOther: data.account.business_type_other ?? "",
              contactName: data.account.application_contact_name ?? "",
              businessEmail: data.account.application_business_email ?? "",
              registrationNumber: data.account.application_business_registration_number ?? "",
              verificationUrl: data.account.application_verification_url ?? "",
              offerings: data.account.application_offerings ?? "",
              referralSource: data.account.application_referral_source ?? "",
              description: data.account.description,
              location: data.account.location,
              websiteUrl: data.account.website_url ?? "",
            }
      );
    }
  }, []);

  useEffect(() => {
    load()
      .catch((loadError) => {
        console.error("Could not load business account", loadError);
        setLoadFailed(true);
        setError(loadError instanceof Error ? loadError.message : "Could not load business account.");
      })
      .finally(() => setLoading(false));
  }, [load]);

  async function sendJson(url: string, method: string, body: unknown) {
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save changes.");
    return result;
  }

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await sendJson("/api/brewery/apply", "POST", application);
      await load();
      setNotice({
        text: result.notificationWarning
          ? "Your business application was submitted, but the admin email notification could not be sent."
          : "Your business application has been submitted for review.",
        warning: result.notificationWarning === true,
      });
    } catch (applyError) {
      console.error("Could not submit business application", applyError);
      setError(applyError instanceof Error ? applyError.message : "Could not submit application.");
    } finally {
      setSaving(false);
    }
  }

  async function savePage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await sendJson("/api/brewery/me", "PATCH", page);
      setNotice({ text: "Business account details updated.", warning: false });
    } catch (saveError) {
      console.error("Could not save business page", saveError);
      setError(saveError instanceof Error ? saveError.message : "Could not save your page.");
    } finally {
      setSaving(false);
    }
  }

  async function switchBusiness(businessId: string) {
    if (!businessId || businessId === account?.id) return;
    setSwitchingBusiness(true);
    setError("");
    setNotice(null);
    try {
      const response = await fetch("/api/brewery/context", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not switch business accounts.");
      await load();
      setNotice({ text: "Active business account changed.", warning: false });
    } catch (switchError) {
      console.error("Could not switch business account", switchError);
      setError(switchError instanceof Error ? switchError.message : "Could not switch business accounts.");
    } finally {
      setSwitchingBusiness(false);
    }
  }

  async function openBilling(endpoint: "checkout" | "portal", plan?: "monthly" | "yearly") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/brewery/billing/${endpoint}`, {
        method: "POST",
        credentials: "include",
        ...(plan ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        } : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open billing.");
      window.location.assign(result.url);
    } catch (billingError) {
      console.error("Could not open brewery billing", billingError);
      setError(billingError instanceof Error ? billingError.message : "Could not open billing.");
      setBusy(false);
    }
  }

  async function deleteBusinessAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteConfirmation !== "DELETE") return;
    setDeletingAccount(true);
    setError("");
    setNotice(null);
    try {
      const response = await fetch("/api/brewery/account", {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete the business account.");
      setDeleteConfirmation("");
      setNotice({
        text: "The business account and its associated data have been deleted.",
        warning: false,
      });
      if (result.cleanupWarning) {
        setError(result.cleanupWarning);
      }
      try {
        await load();
      } catch (reloadError) {
        console.error("Business account was deleted but the page could not reload", reloadError);
        setError("The account was deleted, but this page could not refresh. Reload the page to continue.");
      }
    } catch (deleteError) {
      console.error("Could not delete business account", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the business account.");
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <main className="min-h-screen px-2 py-10 text-white sm:px-6">
      <div className="relative mx-auto mt-8 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-3 pt-16 backdrop-blur-md sm:p-9 sm:pt-16">
      <div className="absolute right-4 top-3 z-40"><MenuOverlay current="brewery" /></div>
      <div className="absolute left-4 top-3 z-40"><BackButton /></div>
        <PageHeading title="Business workspace" subtitle="Manage your business page, product catalogue, team, and subscription separately from your personal brewing account." />
        {error && <p role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-950/40 p-3 text-red-200">{error}</p>}
        {notice && (
          <p
            role="status"
            className={`mb-4 rounded-lg border p-3 ${
              notice.warning
                ? "border-amber-400/30 bg-amber-950/40 text-amber-200"
                : "border-green-400/30 bg-green-950/40 text-green-200"
            }`}
          >
            {notice.text}
          </p>
        )}
        {!loading && businesses.length > 1 && account && (
          <label className="mb-5 block max-w-md text-sm">
            Active business
            <select
              value={account.id}
              disabled={switchingBusiness}
              onChange={(event) => void switchBusiness(event.target.value)}
              className={inputClass}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id} className="bg-zinc-900">
                  {business.name}{business.isOwner ? " (Owner)" : " (Team member)"}
                </option>
              ))}
            </select>
          </label>
        )}

        {loading ? <p className="text-center text-white/65">Loading your page…</p> : needsLogin ? (
          <p className="text-center text-white/75">
            <Link href="/auth/login" className="text-green-200 underline">Log in</Link>
            {" or "}
            <Link href="/auth/signup" className="text-green-200 underline">create an account</Link>
            {" to create a business page."}
          </p>
        ) : loadFailed ? (
          <div className="text-center text-white/75">
            <p>We couldn’t verify your business account, so the application form isn’t available right now.</p>
            <button type="button" onClick={() => {
              setLoading(true);
              setError("");
              load().catch((loadError) => {
                console.error("Could not reload business account", loadError);
                setLoadFailed(true);
                setError(loadError instanceof Error ? loadError.message : "Could not load business account.");
              }).finally(() => setLoading(false));
            }} className="mt-4 rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">Try again</button>
          </div>
        ) : !account ? (
          <form onSubmit={apply} className="mx-auto max-w-2xl space-y-4 rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-semibold text-green-200">Create a business page</h2>
            <p className="text-sm leading-6 text-white/65">Applications are reviewed before you can subscribe and publish your page. One subscription covers your business and its product catalog.</p>
            <p className="text-xs text-white/50">Your contact details are used for application review and are not shown on your public page.</p>
            <label className="block text-sm">Business name<input required maxLength={120} className={inputClass} value={application.name} onChange={(event) => setApplication({ ...application, name: event.target.value })} /></label>
            <label className="block text-sm">Business type<select required className={inputClass} value={application.businessType} onChange={(event) => setApplication({ ...application, businessType: event.target.value })}>{BUSINESS_TYPES.map((type) => <option key={type.value} value={type.value} className="bg-zinc-900">{type.label}</option>)}</select></label>
            {application.businessType === "other" && <label className="block text-sm">Type of business<input required minLength={2} maxLength={100} className={inputClass} value={application.businessTypeOther} onChange={(event) => setApplication({ ...application, businessTypeOther: event.target.value })} placeholder="e.g. tasting room" /></label>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">Contact name<input required minLength={2} maxLength={120} autoComplete="name" className={inputClass} value={application.contactName} onChange={(event) => setApplication({ ...application, contactName: event.target.value })} /></label>
              <label className="block text-sm">Business email<input required type="email" maxLength={254} autoComplete="email" className={inputClass} value={application.businessEmail} onChange={(event) => setApplication({ ...application, businessEmail: event.target.value })} /></label>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <h3 className="font-semibold text-green-200">Verify your business</h3>
              <p className="mt-1 text-sm leading-5 text-white/65">We review these details before approving applications. Provide the business registration number and a public link to an official registry entry or other reliable listing. We don’t ask you to upload identity documents.</p>
              <label className="mt-3 block text-sm">Business registration number or official identifier<input required maxLength={120} className={inputClass} value={application.registrationNumber} onChange={(event) => setApplication({ ...application, registrationNumber: event.target.value })} /></label>
              <label className="mt-3 block text-sm">Public business proof link<input required type="url" maxLength={2048} inputMode="url" placeholder="https://" className={inputClass} value={application.verificationUrl} onChange={(event) => setApplication({ ...application, verificationUrl: event.target.value })} /></label>
              <p className="mt-2 text-xs text-white/50">Use a public webpage that helps us confirm the business and your connection to it. Don’t link to private or sensitive documents.</p>
            </div>
            <label className="block text-sm">What do you make or sell?<textarea required minLength={10} maxLength={2000} rows={3} className={inputClass} value={application.offerings} onChange={(event) => setApplication({ ...application, offerings: event.target.value })} placeholder="Tell us about your drinks, products, or services." /></label>
            <label className="block text-sm">About your business<textarea maxLength={5000} rows={4} className={inputClass} value={application.description} onChange={(event) => setApplication({ ...application, description: event.target.value })} /></label>
            <label className="block text-sm">Location<input maxLength={200} className={inputClass} value={application.location} onChange={(event) => setApplication({ ...application, location: event.target.value })} /></label>
            <label className="block text-sm">Website URL<input type="text" inputMode="url" className={inputClass} value={application.websiteUrl} onChange={(event) => setApplication({ ...application, websiteUrl: event.target.value })} /></label>
            <label className="block text-sm">How did you hear about Batchlogg? <span className="text-white/50">(optional)</span><input maxLength={500} className={inputClass} value={application.referralSource} onChange={(event) => setApplication({ ...application, referralSource: event.target.value })} /></label>
            <button disabled={saving} className="rounded-lg border border-green-400/30 bg-green-700 px-5 py-3 font-semibold disabled:opacity-50">{saving ? "Submitting…" : "Submit application"}</button>
          </form>
        ) : (
          <div className="space-y-7">
            <section id="business-overview" className="scroll-mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Your business</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold">{account.name}</h2>
                    {account.status !== "approved" && (
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                        account.status === "pending"
                          ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
                          : "border-white/15 bg-white/5 text-white/70"
                      }`}>{account.status}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-white/60">{businessTypeLabel(account.business_type, account.business_type_other)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-white/75">
                      Your role: {account.isOwner ? "Owner" : account.role === "manager" ? "Manager" : account.role === "editor" ? "Editor" : "Team member"}
                    </span>
                    {account.status === "approved" && (
                      <span className={`rounded-full border px-3 py-1.5 ${
                        account.stripe_subscription_status === "past_due"
                          ? "border-amber-300/30 bg-amber-950/30 text-amber-100"
                          : account.hasAccess
                            ? "border-green-300/25 bg-green-950/30 text-green-100"
                            : "border-white/15 bg-black/20 text-white/70"
                      }`}>
                        Billing: {account.manual_access_granted_at
                          ? "Sponsored access"
                          : account.stripe_subscription_status === "active"
                            ? "Subscription active"
                            : account.stripe_subscription_status === "trialing"
                              ? "Subscription trial"
                              : account.stripe_subscription_status === "past_due"
                                ? "Payment past due"
                                : account.stripe_subscription_status === "canceled"
                                  ? "Subscription canceled"
                                  : account.hasAccess
                                    ? "Access active"
                                    : "No active subscription"}
                      </span>
                    )}
                  </div>
                </div>
                {account.hasAccess && <Link href={`/business/${account.slug}`} className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">View public page <span aria-hidden="true">↗</span></Link>}
              </div>
              {account.status === "pending" && <p className="mt-4 text-sm text-amber-200">Your application is awaiting review. You’ll be able to subscribe and publish after approval.</p>}
              {account.status === "rejected" && <p className="mt-4 text-sm text-amber-200">This application was not approved. Contact support if you believe this is a mistake.</p>}
              {account.status === "suspended" && <p className="mt-4 text-sm text-red-200">This business account is suspended. Contact support for assistance.</p>}
              {account.isOwner && account.status === "approved" && (
                <div id="business-billing" className="mt-5 scroll-mt-6">
                  {account.hasAccess ? (
                    account.stripe_customer_id ? (
                      <div id="business-billing" className="scroll-mt-6 rounded-lg border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h3 className="font-semibold">Business subscription</h3>
                            <p className="mt-1 text-sm text-white/65">
                              View invoices, update your payment method, or change or cancel your plan securely through Stripe.
                            </p>
                            {account.stripe_subscription_status === "past_due" ? (
                              <p className="mt-2 text-sm text-amber-200">Payment needs attention.</p>
                            ) : ["active", "trialing"].includes(account.stripe_subscription_status ?? "") ? (
                              <p className="mt-2 text-sm text-green-200">Subscription active</p>
                            ) : null}
                          </div>
                          <button type="button" disabled={busy} onClick={() => void openBilling("portal")} className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20 disabled:opacity-50">
                            {busy ? "Opening billing…" : "Manage subscription"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                        <h3 className="font-semibold">Business billing</h3>
                        <p className="mt-1 text-sm text-white/65">
                          {account.manual_access_granted_at
                            ? "Your workspace is currently covered by sponsored access; no Stripe subscription is attached."
                            : "Your business currently has access but no billing portal is available for this account. Contact support if you need help managing billing."}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="rounded-xl border border-green-400/30 bg-green-950/30 p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-400/15 text-lg font-bold text-green-200">✓</span>
                        <div>
                          <h3 className="font-semibold text-green-100">Your business has been approved!</h3>
                          <p className="mt-1 text-sm leading-6 text-white/75">
                            You’re accepted and ready to choose a plan. Complete payment to activate your business account and publish your page.
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/70">
                            One subscription covers your business and its entire product catalogue. Batchlogg is an independent, community-driven project, and active users have a real say in what we build next. Their feedback helps shape our priorities as the platform grows; your subscription supports that ongoing work.
                          </p>
                          <p className="mt-2 text-xs leading-5 text-white/55">
                            Prices are in USD, before applicable taxes. Any applicable tax is calculated at checkout, and the final total is shown before payment.
                          </p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <button type="button" disabled={busy} onClick={() => void openBilling("checkout", "monthly")} className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-left font-semibold hover:bg-white/15 disabled:opacity-50">
                              <span className="block text-lg">$49 <span className="text-sm font-normal text-white/65">/ month</span></span>
                              <span className="mt-1 block text-xs font-normal text-white/60">{busy ? "Opening checkout…" : "Pay monthly"}</span>
                            </button>
                            <button type="button" disabled={busy} onClick={() => void openBilling("checkout", "yearly")} className="rounded-lg border border-green-300/40 bg-green-700/70 px-5 py-3 text-left font-semibold hover:bg-green-600/80 disabled:opacity-50">
                              <span className="flex flex-wrap items-center gap-2 text-lg">$499 <span className="text-sm font-normal text-white/75">/ year</span><span className="rounded-full bg-green-300/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-100">Save $89</span></span>
                              <span className="mt-1 block text-xs font-normal text-white/75">{busy ? "Opening checkout…" : "Pay annually"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {account.hasAccess && (
              <>
                {account.isOwner && <BreweryTeamManager />}
                {(account.isOwner || account.role === "manager") && <form id="business-page-details" onSubmit={savePage} className="scroll-mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
                  <h2 className="text-xl font-semibold text-green-200">Page details</h2>
                  <div className="mt-4 space-y-4">
                  <p className="text-sm text-white/60">Public link: <Link className="underline" href={`/business/${account.slug}`}>/business/{account.slug}</Link></p>
                  <label className="block text-sm">Business name<input required maxLength={120} className={inputClass} value={page.name} onChange={(event) => setPage({ ...page, name: event.target.value })} /></label>
                  <label className="block text-sm">Business type<select required className={inputClass} value={page.businessType} onChange={(event) => setPage({ ...page, businessType: event.target.value })}>{BUSINESS_TYPES.map((type) => <option key={type.value} value={type.value} className="bg-zinc-900">{type.label}</option>)}</select></label>
                  {page.businessType === "other" && <label className="block text-sm">Type of business<input required minLength={2} maxLength={100} className={inputClass} value={page.businessTypeOther} onChange={(event) => setPage({ ...page, businessTypeOther: event.target.value })} placeholder="e.g. tasting room" /></label>}
                  <label className="block text-sm">About<textarea maxLength={5000} rows={4} className={inputClass} value={page.description} onChange={(event) => setPage({ ...page, description: event.target.value })} /></label>
                  <label className="block text-sm">Location<input maxLength={200} className={inputClass} value={page.location} onChange={(event) => setPage({ ...page, location: event.target.value })} /></label>
                  <label className="block text-sm">Website URL<input type="text" inputMode="url" className={inputClass} value={page.websiteUrl} onChange={(event) => setPage({ ...page, websiteUrl: event.target.value })} /></label>
                  <label className="block text-sm">Logo image URL<input type="text" inputMode="url" placeholder="https://example.com/logo.png" className={inputClass} value={page.logoUrl} onChange={(event) => setPage({ ...page, logoUrl: event.target.value })} /></label>
                  <button disabled={saving} className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20 disabled:opacity-50">{saving ? "Saving…" : "Save page details"}</button>
                  </div>
                </form>}
                <section aria-labelledby="business-tools-heading" className="scroll-mt-6">
                  <h2 id="business-tools-heading" className="mb-3 text-xl font-semibold text-green-200">Business workspace tools</h2>
                  <p className="mb-4 text-sm text-white/60">
                    Use these tools for your public business page and product business. Your personal batches and inventory remain in their own sections.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                  {(account.isOwner || account.role === "manager" || account.role === "editor") && <Link href="/business/manage/catalogue" className="group flex min-h-32 flex-col rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-green-400/30 hover:bg-white/10">
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-200/60">Products & reviews</span>
                    <h2 className="mt-2 text-lg font-semibold text-green-200">Product catalogue <span className="transition-transform group-hover:translate-x-1">→</span></h2>
                    <p className="mt-1 text-sm leading-5 text-white/60">Manage products, customer reviews, and owner QR codes.</p>
                  </Link>}
                  {(account.isOwner || account.role === "manager" || account.role === "editor") && <Link href="/business/manage/analytics" className="group flex min-h-32 flex-col rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-green-400/30 hover:bg-white/10">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/45">Performance</span>
                    <h2 className="mt-2 text-lg font-semibold text-green-200">Business analytics <span className="transition-transform group-hover:translate-x-1">→</span></h2>
                    <p className="mt-1 text-sm leading-5 text-white/60">Explore visits, QR scans, ratings, and popular products.</p>
                  </Link>}
                  </div>
                </section>
              </>
            )}
            {account.isOwner && (
              <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-lg font-semibold text-green-200">Delete business account</h2>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  This permanently deletes the public business page, products, team memberships, analytics, and all reviews and reports tied to its products. Uploaded product images will also be removed. This cannot be undone.
                </p>
                {account.stripe_subscription_id &&
                  !["canceled", "incomplete_expired"].includes(account.stripe_subscription_status ?? "") && (
                  <div className="mt-4 rounded-lg border border-green-300/20 bg-green-950/20 p-3">
                    <p className="text-sm text-green-100">
                      Cancel your Business subscription through Stripe before deleting this account. Deletion is blocked until Stripe confirms cancellation.
                    </p>
                    {account.stripe_customer_id && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void openBilling("portal")}
                        className="mt-3 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
                      >
                        {busy ? "Opening billing…" : "Manage subscription"}
                      </button>
                    )}
                  </div>
                )}
                <form onSubmit={deleteBusinessAccount} className="mt-4 space-y-3">
                  <label className="block text-sm text-white/80">
                    Type <strong className="text-white">DELETE</strong> to confirm
                    <input
                      required
                      autoComplete="off"
                      spellCheck={false}
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      className={`${inputClass} focus:border-green-400/50 focus:outline-none`}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={deletingAccount || deleteConfirmation !== "DELETE"}
                    className="rounded-lg border border-green-400/30 bg-green-700/70 px-4 py-2 font-semibold text-white hover:bg-green-600/80 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {deletingAccount ? "Deleting account…" : "Permanently delete business account"}
                  </button>
                </form>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
