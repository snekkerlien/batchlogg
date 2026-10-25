"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
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
  assignedTo: string | null;
  assignedToId: string | null;
  moderator_notes: string | null;
  escalated_at: string | null;
  escalation_note: string | null;
  contentHidden: boolean;
  moderationActions: {
    id: string;
    action_type:
      | "warning"
      | "mute"
      | "content_hidden"
      | "content_restored"
      | "escalation"
      | "note"
      | "assigned"
      | "unassigned"
      | "appeal_upheld"
      | "appeal_overturned";
    reason: string;
    restriction_ends_at: string | null;
    actor: string;
    created_at: string;
  }[];
  appeals: {
    id: string;
    action_id: string;
    appellant: string;
    appeal_text: string;
    status: "pending" | "upheld" | "overturned";
    reviewed_by: string | null;
    reviewer: string | null;
    reviewed_at: string | null;
    resolution_note: string | null;
    created_at: string;
  }[];
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
  const [moderators, setModerators] = useState<{ id: string; username: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [canDeletePermanently, setCanDeletePermanently] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [removingReportId, setRemovingReportId] = useState<string | null>(null);
  const [reportToRemove, setReportToRemove] = useState<Report | null>(null);
  const [actionReason, setActionReason] = useState<Record<string, string>>({});
  const [muteDurationDays, setMuteDurationDays] = useState(3);
  const [appealResolution, setAppealResolution] = useState<Record<string, string>>({});
  const [savingReportId, setSavingReportId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    const response = await fetch("/api/admin/community-reports", {
      cache: "no-store",
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load reports");
    setReports(data.reports);
    setModerators(data.moderators ?? []);
    setCurrentUserId(data.currentUserId ?? "");
    setCanDeletePermanently(data.canDeletePermanently === true);
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

  async function updateReport(report: Report, body: Record<string, unknown>) {
    setError("");
    setSavingReportId(report.id);
    try {
      const response = await fetch("/api/admin/community-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: report.id, ...body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update report");
      try {
        await loadReports();
      } catch (refreshError) {
        console.error("Report was updated but the queue could not refresh", refreshError);
        setError("The report was updated, but the queue could not refresh.");
      }
      return true;
    } catch (updateError) {
      console.error("Could not update moderation report", updateError);
      setError(updateError instanceof Error ? updateError.message : "Could not update report.");
      return false;
    } finally {
      setSavingReportId(null);
    }
  }

  async function applyModerationAction(
    report: Report,
    action: "warning" | "mute" | "hide" | "restore" | "escalate"
  ) {
    setError("");
    setSavingReportId(report.id);
    try {
      const response = await fetch("/api/admin/community-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: report.id,
          action,
          reason: actionReason[report.id]?.trim(),
          ...(action === "mute" ? { durationDays: muteDurationDays } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not apply moderation action");
      setActionReason((current) => ({ ...current, [report.id]: "" }));
      try {
        await loadReports();
      } catch (refreshError) {
        console.error("Moderation action succeeded but the queue could not refresh", refreshError);
        setError("The moderation action succeeded, but the queue could not refresh.");
      }
    } catch (actionError) {
      console.error("Could not apply moderation action", actionError);
      setError(actionError instanceof Error ? actionError.message : "Could not apply moderation action.");
    } finally {
      setSavingReportId(null);
    }
  }

  async function resolveAppeal(report: Report, appealId: string, status: "upheld" | "overturned") {
    const resolutionNote = appealResolution[appealId]?.trim();
    if (!resolutionNote) {
      setError("Add a short decision note before resolving an appeal.");
      return;
    }
    const success = await updateReport(report, {
      action: "resolve_appeal",
      appealId,
      appealStatus: status,
      resolutionNote,
    });
    if (success) {
      setAppealResolution((current) => ({ ...current, [appealId]: "" }));
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
    const matchesContentType =
      contentTypeFilter === "all" || report.content_type === contentTypeFilter;
    const ageDays = (Date.now() - new Date(report.created_at).getTime()) / (24 * 60 * 60 * 1000);
    const matchesAge =
      ageFilter === "all" ||
      (ageFilter === "today" && ageDays < 1) ||
      (ageFilter === "week" && ageDays < 7) ||
      (ageFilter === "older" && ageDays >= 7);
    const matchesPriority =
      priorityFilter === "all" ||
      (priorityFilter === "escalated" && Boolean(report.escalated_at)) ||
      (priorityFilter === "multiple" && report.totalReportsAgainstUser >= 3);
    const matchesAssignment =
      assignmentFilter === "all" ||
      (assignmentFilter === "unassigned" && !report.assignedToId) ||
      (assignmentFilter === "mine" && report.assignedToId === currentUserId) ||
      (assignmentFilter === "assigned" && Boolean(report.assignedToId));
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [report.reporter, report.reported, report.reason, report.content_type, report.reportedMessage ?? ""]
        .some((value) => value.toLowerCase().includes(query));
    return matchesStatus && matchesContentType && matchesAge && matchesPriority &&
      matchesAssignment && matchesSearch;
  });

  return (
    <main className="min-h-screen px-2 py-12 text-white sm:px-6">
      <div className="relative mx-auto mt-12 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-3 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <BackButton />
        </div>
        <div className="absolute right-4 top-2 z-40 sm:top-4">
          <MenuOverlay current="admin" />
        </div>

        <PageHeading
          title="Community reports"
          subtitle="Review member reports and moderate reported content."
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <label className="block">
            <span className="sr-only">Filter report content type</span>
            <select
              value={contentTypeFilter}
              onChange={(event) => setContentTypeFilter(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            >
              <option value="all">All content types</option>
              {[...new Set(reports.map((report) => report.content_type))].sort().map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Filter report age</span>
            <select
              value={ageFilter}
              onChange={(event) => setAgeFilter(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            >
              <option value="all">Any age</option>
              <option value="today">Received today</option>
              <option value="week">Last 7 days</option>
              <option value="older">Older than 7 days</option>
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Filter report priority</span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            >
              <option value="all">All priorities</option>
              <option value="escalated">Escalated</option>
              <option value="multiple">3+ reports against member</option>
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Filter report assignment</span>
            <select
              value={assignmentFilter}
              onChange={(event) => setAssignmentFilter(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black/40 p-3"
            >
              <option value="all">All assignments</option>
              <option value="unassigned">Unassigned</option>
              <option value="mine">Assigned to me</option>
              <option value="assigned">Assigned to a moderator</option>
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
            {filteredReports.map((report) => {
              const reportLocked = Boolean(
                report.assignedToId &&
                report.assignedToId !== currentUserId &&
                !canDeletePermanently
              );
              return (
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
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {report.assignedToId ? (
                        <>
                          <span className="text-xs text-white/60">
                            Assigned to {report.assignedTo}
                          </span>
                          {report.assignedToId === currentUserId && (
                            <button
                              type="button"
                              disabled={savingReportId === report.id}
                              onClick={() => void updateReport(report, { action: "unassign" })}
                              className="rounded border border-white/15 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-50"
                            >
                              Release
                            </button>
                          )}
                        </>
                      ) : (
                        <label className="flex items-center gap-2 text-xs text-white/60">
                          Assign to
                          <select
                            defaultValue=""
                            disabled={savingReportId === report.id}
                            onChange={(event) => {
                              if (event.target.value) {
                                void updateReport(report, {
                                  action: "assign",
                                  assignedToId: event.target.value,
                                });
                                event.target.value = "";
                              }
                            }}
                            className="rounded border border-white/20 bg-black/50 px-2 py-1 text-white"
                          >
                            <option value="">Choose moderator</option>
                            {moderators.map((moderator) => (
                              <option key={moderator.id} value={moderator.id}>
                                {moderator.username}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {report.totalReportsAgainstUser >= 3 && (
                        <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">
                          Multiple reports
                        </span>
                      )}
                      {report.escalated_at && (
                        <span className="rounded-full border border-red-300/25 bg-red-300/10 px-2 py-1 text-xs text-red-100">
                          Escalated to admin
                        </span>
                      )}
                    </div>
                  </div>
                  {canDeletePermanently &&
                    ["post", "reply", "message", "recipe"].includes(report.content_type) && (
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
                {reportLocked && (
                  <p className="mt-2 text-xs text-amber-100/70">
                    Another moderator owns this review. Only they or an administrator can take action.
                  </p>
                )}
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
                {report.moderationActions.length > 0 && (
                  <details className="mt-4 border-t border-white/10 pt-3 text-sm">
                    <summary className="cursor-pointer font-semibold text-white/75">
                      Actions on this report ({report.moderationActions.length})
                    </summary>
                    <ul className="mt-2 space-y-2 text-xs text-white/65">
                      {report.moderationActions.map((action) => (
                        <li key={action.id} className="rounded border border-white/10 p-2">
                          <p className="font-medium capitalize">{action.action_type}</p>
                          <p className="mt-1">{action.reason}</p>
                          {action.restriction_ends_at && (
                            <p className="mt-1">Restriction ends {new Date(action.restriction_ends_at).toLocaleString()}</p>
                          )}
                          <p className="mt-1 text-white/45">
                            {action.actor} · {new Date(action.created_at).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
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
                <section className="mt-4 space-y-4 border-t border-white/10 pt-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-white/55">
                      Private moderator notes
                      <textarea
                        maxLength={2000}
                        defaultValue={report.moderator_notes ?? ""}
                        disabled={reportLocked}
                        onChange={(event) => {
                          setReports((current) =>
                            current.map((item) =>
                              item.id === report.id
                                ? { ...item, moderator_notes: event.target.value }
                                : item
                            )
                          );
                        }}
                        id={`report-notes-${report.id}`}
                        className="mt-2 min-h-20 w-full resize-y rounded-lg border border-white/15 bg-black/40 p-3 text-sm normal-case"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={savingReportId === report.id || reportLocked}
                      onClick={() => {
                        const note = document.getElementById(`report-notes-${report.id}`);
                        if (note instanceof HTMLTextAreaElement) {
                          void updateReport(report, { action: "save_note", note: note.value });
                        }
                      }}
                      className="mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 disabled:opacity-50"
                    >
                      Save private note
                    </button>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-white/55">
                      Action reason
                      <textarea
                        value={actionReason[report.id] ?? ""}
                        disabled={reportLocked}
                        onChange={(event) =>
                          setActionReason((current) => ({
                            ...current,
                            [report.id]: event.target.value,
                          }))
                        }
                        maxLength={500}
                        placeholder="Add a reason for the moderation action"
                        className="mt-2 min-h-16 w-full resize-y rounded-lg border border-white/15 bg-black/40 p-3 text-sm normal-case"
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={savingReportId === report.id || reportLocked || !actionReason[report.id]?.trim()}
                        onClick={() => void applyModerationAction(report, "warning")}
                        className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-300/20 disabled:opacity-40"
                      >
                        Send warning
                      </button>
                      <label className="flex items-center gap-2 text-xs text-white/70">
                        <span>Mute for</span>
                        <select
                          value={muteDurationDays}
                          onChange={(event) => setMuteDurationDays(Number(event.target.value))}
                          className="rounded border border-white/20 bg-black/50 px-2 py-2 text-white"
                        >
                          {[1, 3, 7, 14].map((days) => (
                            <option key={days} value={days}>{days} days</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={savingReportId === report.id || reportLocked || !actionReason[report.id]?.trim()}
                        onClick={() => void applyModerationAction(report, "mute")}
                        className="rounded-lg border border-orange-300/25 bg-orange-300/10 px-3 py-2 text-xs font-semibold text-orange-100 hover:bg-orange-300/20 disabled:opacity-40"
                      >
                        Apply posting mute
                      </button>
                      {(report.content_type === "post" || report.content_type === "reply") && (
                        <button
                          type="button"
                          disabled={savingReportId === report.id || reportLocked || !actionReason[report.id]?.trim()}
                          onClick={() =>
                            void applyModerationAction(report, report.contentHidden ? "restore" : "hide")
                          }
                          className="rounded-lg border border-blue-300/25 bg-blue-300/10 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-300/20 disabled:opacity-40"
                        >
                          {report.contentHidden ? "Restore forum content" : "Hide forum content"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={savingReportId === report.id || reportLocked || !actionReason[report.id]?.trim()}
                        onClick={() => void applyModerationAction(report, "escalate")}
                        className="rounded-lg border border-red-300/25 bg-red-300/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-300/20 disabled:opacity-40"
                      >
                        {report.escalated_at ? "Update admin escalation" : "Escalate to admin"}
                      </button>
                    </div>
                    {report.escalation_note && (
                      <p className="mt-2 text-xs text-white/55">
                        Admin escalation note: {report.escalation_note}
                      </p>
                    )}
                  </div>
                </section>
                {report.appeals.length > 0 && (
                  <section className="mt-4 border-t border-white/10 pt-4">
                    <h3 className="font-semibold text-white/80">Member appeals</h3>
                    <ul className="mt-2 space-y-3">
                      {report.appeals.map((appeal) => (
                        <li key={appeal.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs text-white/50">
                            {appeal.appellant} · {new Date(appeal.created_at).toLocaleString()} · {appeal.status}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">{appeal.appeal_text}</p>
                          {appeal.status === "pending" ? (
                            <>
                              <textarea
                                value={appealResolution[appeal.id] ?? ""}
                                disabled={reportLocked}
                                onChange={(event) =>
                                  setAppealResolution((current) => ({
                                    ...current,
                                    [appeal.id]: event.target.value,
                                  }))
                                }
                                maxLength={1000}
                                placeholder="Decision note for the member"
                                className="mt-3 min-h-16 w-full resize-y rounded-lg border border-white/15 bg-black/40 p-3 text-sm"
                              />
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={savingReportId === report.id || reportLocked}
                                  onClick={() => void resolveAppeal(report, appeal.id, "upheld")}
                                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 disabled:opacity-50"
                                >
                                  Uphold action
                                </button>
                                <button
                                  type="button"
                                  disabled={savingReportId === report.id || reportLocked}
                                  onClick={() => void resolveAppeal(report, appeal.id, "overturned")}
                                  className="rounded-lg border border-green-300/25 bg-green-300/10 px-3 py-2 text-xs font-semibold text-green-100 hover:bg-green-300/20 disabled:opacity-50"
                                >
                                  Overturn action
                                </button>
                              </div>
                            </>
                          ) : (
                            <p className="mt-2 text-xs text-white/60">
                              {appeal.resolution_note} · {appeal.reviewer ?? "Moderator"}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                    Available outcomes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {REPORT_OUTCOMES.filter((outcome) => outcome.status !== report.status).map((outcome) => (
                      <button
                        key={outcome.status}
                        type="button"
                        disabled={updatingReportId === report.id || reportLocked}
                        onClick={() => void updateStatus(report, outcome.status)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-wait disabled:opacity-50 ${outcome.className}`}
                      >
                        {updatingReportId === report.id ? "Saving…" : outcome.label}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
              );
            })}
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
