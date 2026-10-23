"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { dismissBatchGuide, getGuideBatch, type GuideBatch } from "@/app/actions/batchGuide";
import { Qty } from "@/app/components/Units";
import { isBatchGuideMilestone, type BatchGuideMilestone } from "@/lib/brewing/batchGuide";

type GuideStage = BatchGuideMilestone | "overview" | null;
type GuideAction = { title: string; description: string; target: string };

const milestones = [
  { id: "first-batch", label: "Primary", caption: "Get your batch underway" },
  { id: "secondary", label: "Secondary", caption: "An optional next chapter" },
  { id: "conditioning", label: "Conditioning", caption: "Log the steps along the way" },
  { id: "bottling", label: "Finish & Bottle", caption: "Keep the story for next time" },
] as const;

const content: Record<BatchGuideMilestone, {
  eyebrow: string;
  title: string;
  description: string;
  heading: string;
  guidance: string;
  takeaway: string;
  actions: GuideAction[];
}> = {
  "first-batch": {
    eyebrow: "A fresh start",
    title: "Your fermentation journey starts here.",
    description: "You have turned a plan into a batch. Now give the little details a home, so your next brew can build on this one.",
    heading: "What happens in primary?",
    guidance: "This is the first fermentation stage. Your brew-day details and original gravity are saved; the batch page is where you can follow its progress with readings, notes, and photos.",
    takeaway: "There is no fixed countdown. Secondary is optional, and moving stages in Batchlogg is a record of your process, not a signal that fermentation is complete.",
    actions: [
      { title: "Capture brew day", description: "Add a note or photo while the details are fresh.", target: "#batch-notes-content" },
      { title: "Log a gravity reading", description: "Build a record of how this batch develops.", target: "#sg-log" },
      { title: "Set your next check-in", description: "Choose a reminder that fits your process.", target: "#batch-reminders-content" },
    ],
  },
  secondary: {
    eyebrow: "A new chapter",
    title: "Give the next stage some context.",
    description: "Your batch is now recorded as secondary. Keep the transfer details alongside everything you have already learned.",
    heading: "What changed in Batchlogg?",
    guidance: "The batch now shows its secondary start date and any additions or notes you entered. Its earlier readings and notes stay with it, so you can follow the whole story in one place.",
    takeaway: "Make the record your own: note what you observed or changed, and use future readings and reminders to decide what comes next.",
    actions: [
      { title: "Tell the transfer story", description: "Record observations, additions, or a photo.", target: "#batch-notes-content" },
      { title: "Add a gravity reading", description: "Keep your measurements together across stages.", target: "#sg-log" },
      { title: "Plan a follow-up", description: "Set a reminder for your next check-in.", target: "#batch-reminders-content" },
    ],
  },
  conditioning: {
    eyebrow: "A quieter stage",
    title: "Keep track of every conditioning step.",
    description: "Conditioning is a flexible stage for clearing, maturing, stabilizing, backsweetening, and preparing your batch before finishing.",
    heading: "Your process, recorded your way.",
    guidance: "Use Conditioning activity to add a dated entry whenever you rack, clarify, mature, stabilize, backsweeten, adjust, taste, or do something else. Each action has its own details, with notes for anything extra.",
    takeaway: "Log stabilization and backsweetening as separate steps. For example, record the stabilizer and your chosen wait time, then add a backsweetening entry when you do it. The guide records your process; it does not prescribe a schedule.",
    actions: [
      { title: "Log a conditioning step", description: "Add a dated entry for a transfer, treatment, tasting, or other action.", target: "#conditioning-activity" },
      { title: "Check readings and reminders", description: "Track gravity and plan your next check-in.", target: "#sg-log" },
      { title: "Finish when ready", description: "Open Finish & Bottle when you are ready to package.", target: "#finish-batch" },
    ],
  },
  bottling: {
    eyebrow: "A milestone worth keeping",
    title: "Your batch has a story now.",
    description: "From brew day to Finish & Bottle, the details you recorded are there to help you learn, remember, and brew again.",
    heading: "Finished does not mean forgotten.",
    guidance: "Finishing saves the batch's results and frees the vessel. Batch history keeps the record, while the batch results page brings your measurements and recorded outcome together.",
    takeaway: "Revisit your tasting notes and brewing record when planning the next batch. What would you keep, and what would you try differently?",
    actions: [
      { title: "Review this batch", description: "See the measurements and outcome you recorded.", target: "results" },
      { title: "Revisit the brewing record", description: "Find notes, photos, and bottling details in history.", target: "history" },
      { title: "Plan your next batch", description: "Take what you learned back to your recipes.", target: "/my-recipes" },
    ],
  },
};

function StageIllustration({ stage }: { stage: BatchGuideMilestone }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 120" className="h-24 w-24 shrink-0 text-green-300 sm:h-32 sm:w-32">
      <circle cx="60" cy="60" r="55" fill="currentColor" opacity=".07" />
      <circle cx="60" cy="60" r="45" fill="none" stroke="currentColor" opacity=".15" />
      {stage === "bottling" ? (
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M43 26h14v23l8 12v32H35V61l8-12zM40 26h20M77 39h9v18l6 9v27H71V66l6-9z" />
          <path d="M36 72h28v20H36zM72 76h19v16H72z" fill="currentColor" opacity=".2" />
          <path d="m79 23 3 5 6 1-4 4 1 6-6-3-5 3 1-6-4-4 6-1z" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M44 35h32l9 16v36c0 5-4 8-8 8H43c-4 0-8-3-8-8V51zM42 35v-7h36v7M60 28V17h10v7" />
          <path d="M36 65h48v22c0 4-3 7-7 7H43c-4 0-7-3-7-7z" fill="currentColor" opacity=".16" />
          {stage === "first-batch" ? <><circle cx="51" cy="71" r="3" /><circle cx="68" cy="79" r="2" /><circle cx="63" cy="56" r="3" /></> : <><path d="M48 78h24M48 85h16" /><path d="m92 42 5 5-5 5M97 47H84" /></>}
        </g>
      )}
    </svg>
  );
}

export default function BatchGuide() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<GuideStage>(null);
  const [batch, setBatch] = useState<GuideBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [batchError, setBatchError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const loadedBatchTargetRef = useRef<string | null>(null);
  const vesselId = /^\/kar\/([^/]+)$/.exec(pathname)?.[1];
  const finishedBatchId = /^\/brew-insights\/([^/]+)$/.exec(pathname)?.[1];
  const isOpen = stage !== null;

  useEffect(() => {
    const requested = searchParams.get("guide");
    if (requested !== "overview" && !isBatchGuideMilestone(requested)) return;
    loadedBatchTargetRef.current = null;
    setStage(requested);
    setError("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("guide");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}${window.location.hash}`, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const target = vesselId
      ? { vesselId }
      : finishedBatchId
        ? { batchId: finishedBatchId }
        : null;
    if (!target) {
      setLoading(false);
      return;
    }
    const targetKey = vesselId
      ? `vessel:${vesselId}`
      : `batch:${finishedBatchId}`;
    if (loadedBatchTargetRef.current === targetKey) {
      setLoading(false);
      return;
    }
    setBatch(null);
    setBatchError("");
    setLoading(true);
    getGuideBatch(target)
      .then((data) => {
        if (!active) return;
        loadedBatchTargetRef.current = targetKey;
        setBatch(data);
      })
      .catch((loadError: unknown) => {
        console.error("Could not load batch guide details", loadError);
        if (active) {
          loadedBatchTargetRef.current = targetKey;
          setBatchError("Batch details could not be loaded. You can still read the guide.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen, vesselId, finishedBatchId]);

  async function openCurrentStage() {
    setError("");
    setBatchError("");
    if (!vesselId) {
      setStage("overview");
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const data = await getGuideBatch({ vesselId });
      loadedBatchTargetRef.current = `vessel:${vesselId}`;
      setBatch(data);
      setStage(
        data?.status === "Conditioning"
          ? "conditioning"
          : data && ["Sekundær", "secondary"].includes(data.status ?? "")
            ? "secondary"
          : data
            ? "first-batch"
            : "overview"
      );
    } catch (loadError) {
      console.error("Could not load batch guide details", loadError);
      loadedBatchTargetRef.current = `vessel:${vesselId}`;
      setBatchError("Batch details could not be loaded. You can still read the guide.");
      setStage("overview");
    } finally {
      setLoading(false);
    }
  }

  const dismiss = useCallback(async () => {
    if (saving) return false;
    setError("");
    setSaving(true);
    try {
      if (stage && stage !== "overview") await dismissBatchGuide(stage);
      setStage(null);
      return true;
    } catch (dismissError) {
      console.error("Could not dismiss batch guide", dismissError);
      setError("Your choice could not be saved. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [saving, stage]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  function actionHref(target: string) {
    if (target.startsWith("#")) return vesselId && batch ? `${pathname}${target}` : null;
    if (target === "results") return batch && finishedBatchId ? `/brew-insights/${batch.id}` : null;
    if (target === "history") return batch ? `/batch-history?batchId=${encodeURIComponent(batch.id)}` : "/batch-history";
    return target;
  }

  async function followAction(href: string) {
    if (!(await dismiss())) return;
    if (href.startsWith(`${pathname}#`)) {
      window.location.hash = href.slice(pathname.length);
      window.dispatchEvent(new Event("hashchange"));
      document.getElementById(href.split("#")[1])?.scrollIntoView({ block: "start" });
    } else {
      router.push(href);
    }
  }

  const current = stage && stage !== "overview" ? content[stage] : null;
  const currentIndex = milestones.findIndex((item) => item.id === stage);

  return (
    <>
      {(vesselId || finishedBatchId) && (
        <button type="button" disabled={loading} onClick={() => void openCurrentStage()}
          className="fixed bottom-4 right-4 z-[90] rounded-full border border-white/15 bg-zinc-950/95 px-4 py-2 text-sm font-semibold text-white/75 shadow-lg hover:border-green-300/40 hover:text-white">
          Batch guide
        </button>
      )}
      {stage && (
        <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="batch-guide-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") { event.stopPropagation(); void dismiss(); }
              if (event.key !== "Tab") return;
              const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]");
              if (!controls?.length) { event.preventDefault(); return; }
              const first = controls[0];
              const last = controls[controls.length - 1];
              if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
                event.preventDefault(); last.focus();
              } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
                event.preventDefault(); first.focus();
              }
            }}
            className="w-full max-w-3xl shrink-0 rounded-2xl border border-white/15 bg-zinc-950 text-white shadow-2xl outline-none">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-300">Your batch journey</p>
              <button type="button" aria-label="Close batch guide" disabled={saving} onClick={() => void dismiss()}
                className="rounded-lg px-3 py-2 text-lg leading-none text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50">×</button>
            </div>
            <div className="p-5 sm:p-8">
              {current && stage !== "overview" ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-green-300">{current.eyebrow}</p>
                      <h2 id="batch-guide-title" className="mt-3 max-w-lg text-2xl font-bold leading-tight sm:text-3xl">{current.title}</h2>
                    </div>
                    <div className="hidden min-[400px]:block"><StageIllustration stage={stage} /></div>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{current.description}</p>
                </>
              ) : (
                <>
                  <h2 id="batch-guide-title" className="text-2xl font-bold sm:text-3xl">A little help, right when it matters.</h2>
                  <p className="mt-3 text-sm leading-7 text-white/65">A guide to the moments that shape your batch. Explore a stage or come back whenever you need a little direction.</p>
                </>
              )}

              <ol aria-label="Batch journey stages" className="my-6 grid grid-cols-3 gap-2">
                {milestones.map((item, index) => (
                  <li key={item.id}>
                    <button type="button" disabled={saving} aria-current={stage === item.id ? "step" : undefined}
                      onClick={() => { setError(""); setStage(item.id); }}
                      className={`h-full w-full rounded-xl border p-3 text-left transition sm:p-4 ${stage === item.id ? "border-green-300/40 bg-green-400/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"}`}>
                      <span className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${stage === item.id ? "bg-green-700 text-white" : "bg-white/10 text-white/50"}`}>{index + 1}</span>
                      <span className="block text-xs font-semibold sm:text-sm">{item.label}</span>
                      <span className="mt-1 block text-[11px] text-white/45">{index === 1 ? "Optional" : currentIndex === index ? "Exploring this stage" : item.caption}</span>
                    </button>
                  </li>
                ))}
              </ol>

              {loading && <p role="status" className="mb-5 text-sm text-white/50">Loading your batch details…</p>}
              {batchError && <p role="alert" className="mb-5 text-sm text-amber-200">{batchError}</p>}
              {batch && (
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-300/15 bg-green-950/20 p-4">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-widest text-white/45">Your batch{batch.batchnummer ? ` · ${batch.batchnummer}` : ""}</p>
                    <p className="mt-1 break-words font-semibold text-green-200">{batch.name || "Unnamed batch"}</p>
                    {batch.type && <p className="mt-1 text-xs text-white/50">{batch.type}</p>}
                  </div>
                  <dl className="flex flex-wrap gap-6 text-sm">
                    {batch.og != null && <div><dt className="text-xs text-white/45">OG</dt><dd className="mt-1 font-mono">{Number(batch.og).toFixed(3)}</dd></div>}
                    {batch.volume_l != null && <div><dt className="text-xs text-white/45">Batch volume</dt><dd className="mt-1"><Qty kind="volume" value={Number(batch.volume_l)} /></dd></div>}
                    {finishedBatchId && batch.abv != null && <div><dt className="text-xs text-white/45">Final ABV</dt><dd className="mt-1">{Number(batch.abv).toFixed(1)}%</dd></div>}
                  </dl>
                </div>
              )}

              {current && (
                <>
                  <h3 className="font-semibold text-white/90">{current.heading}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/60">{current.guidance}</p>
                  <p className="mt-4 border-l-2 border-green-300/40 pl-4 text-sm leading-6 text-white/60">{current.takeaway}</p>
                  {stage === "first-batch" && (
                    <aside className="mt-5 rounded-xl border border-green-300/40 bg-green-400/10 p-4 shadow-[0_0_24px_color-mix(in_srgb,var(--user-accent)_12%,transparent)] sm:p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-green-300">
                        Planning flavor variations?
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-white/90 sm:text-base">
                        Split the batch into separate vessels before secondary to
                        try different flavor combinations and track each
                        variation on its own.
                      </p>
                    </aside>
                  )}
                  <h3 className="mb-3 mt-7 text-xs font-semibold uppercase tracking-widest text-white/45">Make your next move</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {current.actions.flatMap((action) => {
                      const href = actionHref(action.target);
                      return href ? [{ ...action, href }] : [];
                    }).map((action, index) => {
                      return (
                        <a key={action.target} href={action.href} aria-disabled={saving}
                          onClick={(event) => { event.preventDefault(); if (!saving) void followAction(action.href); }}
                          className={`rounded-xl border p-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300 ${index === 0 ? "border-green-300/30 bg-green-400/10 hover:bg-green-400/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"} ${saving ? "pointer-events-none opacity-50" : ""}`}>
                          <span className="block text-sm font-semibold text-green-200">{action.title}<span aria-hidden="true" className="ml-2">→</span></span>
                          <span className="mt-2 block text-xs leading-5 text-white/55">{action.description}</span>
                        </a>
                      );
                    })}
                    {!vesselId && stage !== "bottling" && (
                      <a href="/batch-history" onClick={(event) => { event.preventDefault(); if (!saving) void followAction("/batch-history"); }}
                        className="rounded-xl border border-green-300/25 bg-green-400/10 p-4 text-sm font-semibold text-green-200">
                        Find your batch <span aria-hidden="true">→</span>
                        <span className="mt-2 block text-xs font-normal leading-5 text-white/55">Open a batch to use its notes, readings, and reminders.</span>
                      </a>
                    )}
                  </div>
                </>
              )}
              {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                <p className="text-xs text-white/40">Your process, your pace. Reopen this from Batch guide.</p>
                <button type="button" disabled={saving} onClick={() => void dismiss()}
                  className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-50">
                  {saving ? "Saving…" : "Back to my batch"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
