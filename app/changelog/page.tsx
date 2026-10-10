"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

interface ChangelogEntry {
  version: string;
  entry_date: string;
  title: string;
  body: string;
}

export default function ChangelogClient() {
  const router = useRouter();
  const [logs, setLogs] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/changelog-history", {
          cache: "no-store",
          credentials: "include",
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load changelog");

        setLogs(data.logs);
      } catch (err) {
        console.error("Could not load changelog", err);
        setError(err instanceof Error ? err.message : "Could not load changelog.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white">
        Loading changelog…
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto w-full max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">

        <div className="absolute right-4 top-4 z-40">
          <MenuOverlay current="changelog" />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg"
            aria-label="Go back"
          >
            ←
          </button>
        </div>

        <PageHeading
          title="Changelog"
          subtitle="See what’s new and what has changed over time."
        />

        {error && (
          <p role="alert" className="mb-4 text-sm text-amber-300">
            {error}
          </p>
        )}

        <section className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <ol className="flex max-h-[65vh] min-h-72 flex-col gap-4 overflow-y-auto p-6">
            {logs.length ? (
              logs.map((log) => (
                <li
                  key={log.version}
                  className="rounded-xl bg-black/40 p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{log.title}</h2>
                    <span className="text-white/50">
                      {new Date(log.entry_date).toLocaleDateString("en-GB")}
                    </span>
                  </div>

                  <p className="text-sm text-white/60 mt-1">
                    Version {log.version}
                  </p>

                  <p className="mt-4 whitespace-pre-wrap break-words">
                    {log.body}
                  </p>
                </li>
              ))
            ) : (
              <li className="m-auto text-sm text-white/55">
                No changelog entries yet.
              </li>
            )}
          </ol>
        </section>
      </div>
    </main>
  );
}
