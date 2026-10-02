"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

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
    return <main className="min-h-screen p-10 text-red-400">Access denied.</main>;
  }

  return (
    <main className="min-h-screen p-6 text-white sm:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-green-300 underline">← Admin panel</Link>
        <h1 className="mb-6 mt-4 text-3xl font-bold">Community reports</h1>
        {error && <p role="alert" className="mb-4 text-amber-300">{error}</p>}
        {loading ? (
          <p>Loading reports…</p>
        ) : reports.length === 0 ? (
          <p className="text-white/60">No reports submitted.</p>
        ) : (
          <ul className="space-y-4">
            {reports.map((report) => (
              <li key={report.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {report.reporter} reported {report.reported}
                    </p>
                    <time className="text-xs text-white/50">
                      {new Date(report.created_at).toLocaleString()}
                    </time>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateStatus(report)}
                    className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
                  >
                    {report.status === "open" ? "Mark reviewed" : "Reopen"}
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">{report.reason}</p>
                {report.reportedMessage && (
                  <blockquote className="mt-3 border-l-2 border-red-400/50 pl-3 text-sm text-white/60">
                    {report.reportedMessage}
                  </blockquote>
                )}
                <p className="mt-3 text-xs uppercase tracking-wide text-white/50">
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
