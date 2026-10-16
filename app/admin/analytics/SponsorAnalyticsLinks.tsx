"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

interface SponsorLink {
  id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  url: string | null;
}

const EXPIRY_OPTIONS = [
  { days: 1, label: "1 day" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 180, label: "180 days" },
  { days: 365, label: "365 days" },
];

async function readResponse(response: Response) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Sponsor link request failed.");
  return result;
}

export function SponsorAnalyticsLinks() {
  const [links, setLinks] = useState<SponsorLink[]>([]);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadLinks = useCallback(async () => {
    const data = await readResponse(
      await fetch("/api/admin/analytics/share-links", {
        cache: "no-store",
        credentials: "include",
      })
    );
    setLinks(data.links);
  }, []);

  useEffect(() => {
    loadLinks()
      .catch((loadError) => {
        console.error("Could not load sponsor analytics links", loadError);
        setError("Sponsor links could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, [loadLinks]);

  async function createLink() {
    setPending(true);
    setError("");
    setNotice("");
    setCopiedLinkId(null);
    try {
      await readResponse(
        await fetch("/api/admin/analytics/share-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ expiresInDays }),
        })
      );
      setNotice("Sponsor link created. Its address is available below.");
      await loadLinks();
    } catch (createError) {
      console.error("Could not create sponsor analytics link", createError);
      setError(createError instanceof Error ? createError.message : "Could not create sponsor link.");
    } finally {
      setPending(false);
    }
  }

  async function updateLink(id: string, action: "revoke" | "delete") {
    setPending(true);
    setError("");
    setNotice("");
    try {
      await readResponse(
        await fetch("/api/admin/analytics/share-links", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id, action }),
        })
      );
      setNotice(action === "revoke" ? "Sponsor link revoked." : "Sponsor link entry deleted.");
      await loadLinks();
      return true;
    } catch (actionError) {
      console.error(`Could not ${action} sponsor analytics link`, actionError);
      setError(actionError instanceof Error ? actionError.message : `Could not ${action} sponsor link.`);
      return false;
    } finally {
      setPending(false);
    }
  }

  async function copyLink(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(id);
    } catch (copyError) {
      console.error("Could not copy sponsor link", copyError);
      setError("Could not copy the link. Select and copy it manually.");
    }
  }

  const now = Date.now();

  return (
    <section
      aria-labelledby="sponsor-links-heading"
      className="mb-8 rounded-xl border border-white/10 bg-white/5 p-5 sm:p-6"
    >
      <h2 id="sponsor-links-heading" className="text-xl font-semibold">
        Sponsor sharing
      </h2>
      <p className="mt-2 text-sm text-white/70">
        Create a revocable link to an aggregate overview of public profiles,
        recipes, and discussions. Each link expires after the duration you choose.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-white/80">
          Link lifetime
          <select
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(Number(event.target.value))}
            className="mt-1 block rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-white"
          >
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.days} value={option.days}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={createLink}
          disabled={pending}
          className="rounded-lg border border-green-400/40 bg-green-500/10 px-4 py-2 font-semibold text-green-200 transition hover:bg-green-500/20 disabled:cursor-wait disabled:opacity-50"
        >
          {pending ? "Please wait..." : "Generate sponsor link"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 text-sm text-green-200">
          {notice}
        </p>
      )}

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-white/80">Generated links</h3>
        {loading ? (
          <p className="text-sm text-white/50">Loading links...</p>
        ) : links.length === 0 ? (
          <p className="text-sm text-white/50">No sponsor links have been generated.</p>
        ) : (
          <ul className="space-y-2">
            {links.map((link) => {
              const expired = new Date(link.expires_at).getTime() <= now;
              const status = link.revoked_at ? "Revoked" : expired ? "Expired" : "Active";
              const url = link.url;
              return (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-white/80">
                      {status} · expires {new Date(link.expires_at).toLocaleString("en-GB")}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      Created {new Date(link.created_at).toLocaleString("en-GB")}
                    </p>
                      {url ? (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="max-w-full break-all text-xs text-green-200 underline"
                          >
                            {url}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyLink(link.id, url)}
                            className="rounded border border-white/15 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                          >
                            {copiedLinkId === link.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      ) : (
                      <p className="mt-2 text-xs text-amber-200/80">
                        This older link cannot be recovered. Generate a replacement if needed.
                      </p>
                    )}
                  </div>
                  {status === "Active" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => updateLink(link.id, "revoke")}
                      className="rounded-lg border border-red-400/30 px-3 py-1.5 text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                  {status !== "Active" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setLinkToDelete(link.id)}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-white/70 hover:bg-white/10 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <ConfirmDialog
        open={linkToDelete !== null}
        title="Delete sponsor link entry?"
        message="Permanently delete this revoked or expired sponsor link entry? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() =>
          linkToDelete ? updateLink(linkToDelete, "delete") : Promise.resolve(false)
        }
        onCancel={() => setLinkToDelete(null)}
      />
    </section>
  );
}
