"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

interface Report {
  id: string;
  reporter: string;
  reported: string;
  reason: string;
  reportedMessage: string | null;
  status: "open" | "reviewed";
  created_at: string;
}

export default function CommunityReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  async function updateStatus(report: Report) {
    const status = report.status === "open" ? "reviewed" : "open";
    setError("");
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
    } catch (updateError) {
      console.error("Could not update community report", updateError);
      setError(updateError instanceof Error ? updateError.message : "Could not update report.");
    }
  }

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data, error: authError }) => {
      if (authError) console.error("Could not verify admin access", authError);
      setIsAdmin(data.user?.email?.toLowerCase() === "mads@snekkerlien.no");
    });
  }, []);

  if (isAdmin === false) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-red-500/30 bg-black/60 p-8 text-center backdrop-blur-md">
          <h1 className="text-2xl font-bold text-red-300">Access denied</h1>
          <p className="mt-2 text-white/70">
            This page is only available to administrators.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
          >
            Go to main site
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-10 sm:pt-16">
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
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
            No reports submitted.
          </div>
        ) : (
          <ul className="space-y-4">
            {reports.map((report) => (
              <li
                key={report.id}
                className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-green-400/30 hover:bg-white/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-green-300">
                      {report.reporter} reported {report.reported}
                    </p>
                    <time className="mt-1 block text-xs text-zinc-400">
                      {new Date(report.created_at).toLocaleString()}
                    </time>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateStatus(report)}
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20"
                  >
                    {report.status === "open" ? "Mark reviewed" : "Reopen"}
                  </button>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                  {report.reason}
                </p>
                {report.reportedMessage && (
                  <blockquote className="mt-4 rounded-r-lg border-l-2 border-red-400/50 bg-black/30 py-3 pl-4 pr-3 text-sm text-white/60">
                    {report.reportedMessage}
                  </blockquote>
                )}
                <p
                  className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    report.status === "open"
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                      : "border-green-400/30 bg-green-400/10 text-green-200"
                  }`}
                >
                  {report.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
