"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import ConfirmDialog from "@/app/components/ConfirmDialog";

interface Report {
  id: string;
  content_id: string | null;
  reporter: string;
  reported: string;
  totalReportsAgainstUser: number;
  reason: string;
  reportedMessage: string | null;
  attachments: { path: string; url: string }[];
  status: "open" | "under_review" | "action_taken" | "closed";
  content_type: string;
  category: string | null;
  context_url: string | null;
  history: {
    id: string;
    previous_status: string;
    new_status: string;
    actor: string;
    created_at: string;
  }[];
  priorReports: {
    id: string;
    content_type: string;
    status: string;
    reason: string;
    created_at: string;
  }[];
  priorActions: {
    id: string;
    action: string;
    details: Record<string, unknown> | null;
    actor: string;
    created_at: string;
  }[];
  activeRestrictions: {
    restriction_type: string;
    starts_at: string;
    ends_at: string | null;
    reason: string | null;
  }[];
  created_at: string;
}

const REPORT_OUTCOMES: {
  status: Report["status"];
  label: string;
  className: string;
}[] = [
  {
    status: "under_review",
    label: "Mark under review",
    className: "border-blue-400/30 bg-blue-900/20 text-blue-100 hover:bg-blue-900/40",
  },
  {
    status: "action_taken",
    label: "Mark action taken",
    className: "border-green-400/30 bg-green-900/20 text-green-100 hover:bg-green-900/40",
  },
  {
    status: "closed",
    label: "Close report",
    className: "border-white/20 bg-white/5 text-white/80 hover:bg-white/10",
  },
  {
    status: "open",
    label: "Reopen report",
    className: "border-amber-400/30 bg-amber-900/20 text-amber-100 hover:bg-amber-900/40",
  },
];

export function CommunityReportsClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [removingReportId, setRemovingReportId] = useState<string | null>(null);
  const [reportToRemove, setReportToRemove] = useState<Report | null>(null);

  const loadReports = useCallback(async () => {
    const response = await fetch("/api/admin/community-reports", {
      cache: "no-store",
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load reports");
    setReports(data.reports);
  }, []);

  useEffect(() => {
    loadReports()
      .catch((loadError) => {
        console.error("Could not load community reports", loadError);
        setError("Could not load community reports.");
      })
      .finally(() => setLoading(false));
  }, [loadReports]);

  async function updateStatus(report: Report, status: Report["status"]) {
    setError("");
    setUpdatingReportId(report.id);
    try {
      const response = await fetch("/api/admin/community-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: report.id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update report");
      setReports((current) =>
        current.map((item) => item.id === report.id ? { ...item, status } : item)
      );
      try {
        await loadReports();
      } catch (refreshError) {
        console.error("Report status changed but history could not be refreshed", refreshError);
        setError("The status was updated, but report history could not be refreshed.");
      }
    } catch (updateError) {
      console.error("Could not update community report", updateError);
      setError(updateError instanceof Error ? updateError.message : "Could not update report.");
    } finally {
      setUpdatingReportId(null);
    }
  }

  async function removeReportedContent(report: Report) {
    setError("");
    setRemovingReportId(report.id);
    try {
      const response = await fetch("/api/admin/community-reports", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: report.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove reported content");
      await loadReports();
      return true;
    } catch (removeError) {
      console.error("Could not remove reported content", removeError);
      setError(removeError instanceof Error ? removeError.message : "Could not remove content.");
      return false;
    } finally {
      setRemovingReportId(null);
    }
  }

  const filteredReports = reports.filter((report) => {
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [report.reporter, report.reported, report.reason, report.content_type, report.reportedMessage ?? ""]
        .some((value) => value.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  return (
    <main className="min-h-screen px-2 py-12 text-white sm:px-6">
      <div className="relative mx-auto mt-12 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-3 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <Link
            href="/admin"
            aria-label="Back to Admin Dashboard"
            className="flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 transition hover:bg-white/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19l-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </Link>
        </div>
        <div className="absolute right-4 top-2 z-40 sm:top-4">
          <MenuOverlay current="admin" />
        </div>

        <PageHeading
          title="Community reports"
          subtitle="Review member reports and moderate reported content."
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="sr-only">Search reports</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports"
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            />
          </label>
          <label className="block">
            <span className="sr-only">Filter report status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="under_review">Under review</option>
              <option value="action_taken">Action taken</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-500/50 bg-red-700/30 p-4 text-center"
          >
            {error}
          </div>
        )}
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/70">
            Loading reports…
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
            No reports match this filter.
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredReports.map((report) => (
              <li
                key={report.id}
                className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-green-400/30 hover:bg-white/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-green-300">
                      {report.reporter} reported {report.reported}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-white/50">
                      {report.content_type}{report.category ? ` · ${report.category}` : ""}
                    </p>
                    <time className="mt-1 block text-xs text-zinc-400">
                      {new Date(report.created_at).toLocaleString()}
                    </time>
                  </div>
                  {["post", "reply", "message", "recipe"].includes(report.content_type) && (
                    <button
                      type="button"
                      disabled={removingReportId === report.id || updatingReportId === report.id}
                      onClick={() => setReportToRemove(report)}
                      className="mt-3 rounded-lg border border-red-400/30 bg-red-900/20 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/40 disabled:cursor-wait disabled:opacity-50"
                    >
                      {removingReportId === report.id ? "Removing…" : "Remove reported content"}
                    </button>
                  )}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                  {report.reason}
                </p>
                <p className="mt-2 text-xs text-white/50">
                  Reports against this member: {report.totalReportsAgainstUser}
                </p>
                {report.reportedMessage && (
                  <blockquote className="mt-4 rounded-r-lg border-l-2 border-red-400/50 bg-black/30 py-3 pl-4 pr-3 text-sm text-white/60">
                    {report.reportedMessage}
                  </blockquote>
                )}
                {report.content_id && (
                  <p className="mt-2 break-all text-xs text-white/45">
                    Reported {report.content_type} ID: {report.content_id}
                  </p>
                )}
                {report.attachments.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                      Screenshot evidence ({report.attachments.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {report.attachments.map((attachment) => (
                        <a
                          key={attachment.path}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-lg border border-white/10"
                        >
                          <img
                            src={attachment.url}
                            alt="Screenshot evidence attached to report"
                            loading="lazy"
                            className="max-h-56 w-full object-contain"
                          />
                        </a>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-white/40">
                      Private links expire after one minute.
                    </p>
                  </div>
                )}
                <p
                  className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    report.status === "open"
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                      : report.status === "closed"
                        ? "border-green-400/30 bg-green-400/10 text-green-200"
                        : "border-blue-400/30 bg-blue-400/10 text-blue-200"
                    }`}
                >
                    {report.status.replace("_", " ")}
                </p>
                {report.context_url && (
                    <a
                      href={report.context_url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-3 inline-block text-sm text-green-300 underline"
                    >
                      Open reported content
                    </a>
                )}
                {report.history.length > 0 && (
                    <details className="mt-4 border-t border-white/10 pt-3 text-xs text-white/60">
                      <summary className="cursor-pointer">Report history ({report.history.length})</summary>
                      <ul className="mt-2 space-y-1">
                        {report.history.map((event) => (
                          <li key={event.id}>
                            {event.previous_status.replace("_", " ")} → {event.new_status.replace("_", " ")}
                            {" · "}{event.actor} · {new Date(event.created_at).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    </details>
                )}
                <details className="mt-4 border-t border-white/10 pt-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-white/75">
                    Member moderation context
                    {" · "}
                    {report.priorReports.length} earlier report{report.priorReports.length === 1 ? "" : "s"}
                    {" · "}
                    {report.priorActions.length} prior action{report.priorActions.length === 1 ? "" : "s"}
                    {" · "}
                    {report.activeRestrictions.length} active restriction{report.activeRestrictions.length === 1 ? "" : "s"}
                  </summary>
                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    <section>
                      <h3 className="font-semibold text-white/85">Earlier reports</h3>
                      {report.priorReports.length ? (
                        <ul className="mt-2 space-y-2 text-xs text-white/65">
                          {report.priorReports.map((previous) => (
                            <li key={previous.id} className="rounded border border-white/10 p-2">
                              <p className="font-medium">
                                {previous.content_type} · {previous.status.replace("_", " ")}
                              </p>
                              <p className="mt-1 line-clamp-3">{previous.reason}</p>
                              <time className="mt-1 block text-white/45">
                                {new Date(previous.created_at).toLocaleString()}
                              </time>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-white/50">No earlier reports in the available report history.</p>
                      )}
                    </section>
                    <section>
                      <h3 className="font-semibold text-white/85">Prior moderation actions</h3>
                      {report.priorActions.length ? (
                        <ul className="mt-2 space-y-2 text-xs text-white/65">
                          {report.priorActions.slice(0, 10).map((action) => (
                            <li key={action.id} className="rounded border border-white/10 p-2">
                              <p className="font-medium">{action.action.replace(/[._]/g, " ")}</p>
                              {action.details && Object.keys(action.details).length > 0 && (
                                <p className="mt-1">
                                  {Object.entries(action.details)
                                    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`)
                                    .join(" · ")}
                                </p>
                              )}
                              <p className="mt-1 text-white/45">
                                {action.actor} · {new Date(action.created_at).toLocaleString()}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-white/50">No prior moderation actions were found.</p>
                      )}
                    </section>
                    <section>
                      <h3 className="font-semibold text-white/85">Active restrictions</h3>
                      {report.activeRestrictions.length ? (
                        <ul className="mt-2 space-y-2 text-xs text-white/65">
                          {report.activeRestrictions.map((restriction) => (
                            <li key={`${restriction.restriction_type}:${restriction.starts_at}`} className="rounded border border-amber-300/20 bg-amber-950/20 p-2">
                              <p className="font-medium capitalize">{restriction.restriction_type}</p>
                              <p className="mt-1">
                                {restriction.ends_at
                                  ? `Until ${new Date(restriction.ends_at).toLocaleString()}`
                                  : "Indefinite"}
                              </p>
                              <p className="mt-1">{restriction.reason || "No reason recorded."}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-white/50">No active restrictions.</p>
                      )}
                    </section>
                  </div>
                </details>
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                    Available outcomes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {REPORT_OUTCOMES.filter((outcome) => outcome.status !== report.status).map((outcome) => (
                      <button
                        key={outcome.status}
                        type="button"
                        disabled={updatingReportId === report.id}
                        onClick={() => void updateStatus(report, outcome.status)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-wait disabled:opacity-50 ${outcome.className}`}
                      >
                        {updatingReportId === report.id ? "Saving…" : outcome.label}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConfirmDialog
        open={reportToRemove !== null}
        title="Remove reported content?"
        message="Permanently remove the reported content and mark this report as action taken?"
        confirmLabel="Remove content"
        onConfirm={() =>
          reportToRemove
            ? removeReportedContent(reportToRemove)
            : Promise.resolve(false)
        }
        onCancel={() => setReportToRemove(null)}
      />
    </main>
  );
}
