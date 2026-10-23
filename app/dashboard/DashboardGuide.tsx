"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type DashboardGuideVessel = {
  id: string;
  nummer: number;
  status: "Aktiv" | "Sekundær" | "Conditioning" | "Ledig";
  batchName?: string | null;
  activeBatchId?: string | null;
  latestReading?: { sg: number | string; created_at: string } | null;
  nextReminder?: {
    type: "manual" | "sg_check";
    message: string;
    remind_at: string;
  } | null;
  ownerUsername?: string;
};

function formatDateTime(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Date unavailable";
}

export default function DashboardGuide({
  vessels,
}: {
  vessels: DashboardGuideVessel[];
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const activeVessels = vessels.filter(
    (vessel) => vessel.activeBatchId && vessel.status !== "Ledig"
  );

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [open]);

  return (
    <>
      {typeof document !== "undefined" &&
        createPortal(
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="fixed bottom-4 right-4 z-[90] rounded-full border border-white/15 bg-zinc-950/95 px-4 py-2 text-sm font-semibold text-white/75 shadow-lg hover:border-green-300/40 hover:text-white"
          >
            Dashboard guide
          </button>,
          document.body
        )}
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <section
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-guide-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setOpen(false);
              }
              if (event.key !== "Tab") return;
              const controls =
                dialogRef.current?.querySelectorAll<HTMLElement>(
                  "button:not(:disabled), a[href]"
                );
              if (!controls?.length) {
                event.preventDefault();
                return;
              }
              const first = controls[0];
              const last = controls[controls.length - 1];
              if (
                event.shiftKey &&
                (document.activeElement === first ||
                  document.activeElement === dialogRef.current)
              ) {
                event.preventDefault();
                last.focus();
              } else if (
                !event.shiftKey &&
                (document.activeElement === last ||
                  document.activeElement === dialogRef.current)
              ) {
                event.preventDefault();
                first.focus();
              }
            }}
            className="w-full max-w-3xl shrink-0 rounded-2xl border border-white/15 bg-zinc-950 text-white shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-300">
                Your brewing workspace
              </p>
              <button
                type="button"
                aria-label="Close dashboard guide"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-lg leading-none text-white/60 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="p-5 sm:p-8">
              <h2
                id="dashboard-guide-title"
                className="text-2xl font-bold sm:text-3xl"
              >
                A clear view of what’s brewing.
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/65">
                Your vessels show what is fermenting and where. Open a batch
                whenever you want to record a reading, add a note, or update its
                stage.
              </p>

              <div className="flex flex-col">
              <section
                aria-labelledby="dashboard-guide-tools"
                className="order-1 mt-7"
              >
                <h3
                  id="dashboard-guide-tools"
                  className="font-semibold text-white/90"
                >
                  Your dashboard tools
                </h3>
                <ul className="mt-3 grid gap-3 text-sm leading-6 text-white/65 sm:grid-cols-2">
                  <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <strong className="text-white/85">Vessels</strong>
                    <p className="mt-1">
                      Open a vessel to update its batch. Empty vessels are ready
                      for a new brew.
                    </p>
                  </li>
                  <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <strong className="text-white/85">Select vessels</strong>
                    <p className="mt-1">
                      Choose an occupied vessel to move a batch, or select
                      vessels to delete. Deleting a vessel with an active batch
                      also permanently deletes that batch and its notes. You
                      will see a confirmation before deletion.
                    </p>
                  </li>
                  <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <strong className="text-white/85">Vessels shared with me</strong>
                    <p className="mt-1">
                      Open a shared vessel to collaborate, or leave it when you
                      no longer need access.
                    </p>
                  </li>
                  <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <strong className="text-white/85">Shortcuts</strong>
                    <p className="mt-1">
                      Plan a recipe, review past batches, or explore brewing
                      insights from the links above your vessels.
                    </p>
                  </li>
                </ul>
              </section>

              <section
                aria-labelledby="dashboard-guide-batches"
                className="order-2 mt-7"
              >
                <h3
                  id="dashboard-guide-batches"
                  className="font-semibold text-white/90"
                >
                  Active batches
                </h3>
                {activeVessels.length === 0 ? (
                  <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/60">
                    No active batches yet. Use <strong className="text-white/80">Plan a recipe</strong> to
                    get started, then register it in an empty vessel.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {activeVessels.map((vessel) => {
                      const reminder = vessel.nextReminder;
                      const due =
                        reminder !== null &&
                        reminder !== undefined &&
                        Date.parse(reminder.remind_at) <= Date.now();
                      return (
                        <li
                          key={vessel.id}
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold">
                                {vessel.batchName || `Vessel ${vessel.nummer}`}
                              </h4>
                              <p className="mt-1 text-xs text-white/50">
                                Vessel {vessel.nummer}
                                {vessel.ownerUsername
                                  ? ` · shared by ${vessel.ownerUsername}`
                                  : ""}
                                {" · "}
                                {vessel.status === "Conditioning"
                                  ? "Conditioning"
                                  : vessel.status === "Sekundær"
                                    ? "Secondary fermentation"
                                    : "Primary fermentation"}
                              </p>
                            </div>
                            {due && (
                              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-100">
                                Due
                              </span>
                            )}
                          </div>

                          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-white/45">
                                {reminder ? "Next reminder" : "Suggested next step"}
                              </dt>
                              <dd className="mt-1 text-sm text-white/85">
                                {reminder
                                  ? reminder.message
                                  : vessel.status === "Conditioning"
                                    ? "Check the batch before finishing"
                                    : vessel.status === "Sekundær"
                                      ? "Check gravity before packaging"
                                      : "Take a gravity reading"}
                              </dd>
                              {reminder && (
                                <dd className="mt-1 text-xs text-white/50">
                                  {due ? "Due" : "Scheduled"}{" "}
                                  {formatDateTime(reminder.remind_at)}
                                </dd>
                              )}
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-wide text-white/45">
                                Latest gravity reading
                              </dt>
                              <dd className="mt-1 text-sm text-white/85">
                                {vessel.latestReading ? (
                                  <>
                                    <span className="font-mono font-semibold">
                                      {Number(vessel.latestReading.sg).toFixed(3)}
                                    </span>
                                    <time
                                      className="ml-2 text-xs text-white/50"
                                      dateTime={vessel.latestReading.created_at}
                                    >
                                      {formatDateTime(
                                        vessel.latestReading.created_at
                                      )}
                                    </time>
                                  </>
                                ) : (
                                  <span className="text-white/55">
                                    No readings logged yet
                                  </span>
                                )}
                              </dd>
                            </div>
                          </dl>

                          <a
                            href={`/kar/${vessel.id}`}
                            className="mt-4 inline-flex rounded-lg border border-green-500/40 bg-green-800/50 px-3 py-2 text-sm font-semibold hover:bg-green-700"
                          >
                            Open batch
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              </div>
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
