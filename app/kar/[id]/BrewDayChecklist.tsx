"use client";

import { useEffect, useRef, useState } from "react";
import {
  createDefaultChecklistState,
  getBrewDaySteps,
  MAX_TIMER_MINUTES,
  parseChecklistState,
  SECONDARY_FERMENTATION_STEPS,
  type ChecklistState,
} from "@/lib/brewing/brewDayChecklist";
import ExpandArrowButton from "@/app/components/ExpandArrowButton";

type BrewDayChecklistProps = {
  batchId: string;
  batchType: string;
  beerSubtype?: string | null;
  batchName: string;
  boilMinutes?: number | null;
  isSecondary?: boolean;
};

type LoadStatus = "loading" | "ready" | "error";
type SaveStatus = "saved" | "saving" | "error";

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function BrewDayChecklist({
  batchId,
  batchType,
  beerSubtype,
  batchName,
  boilMinutes,
  isSecondary = false,
}: BrewDayChecklistProps) {
  const steps = getBrewDaySteps(batchType, beerSubtype);
  const visibleSteps = isSecondary
    ? [...steps, ...SECONDARY_FERMENTATION_STEPS]
    : steps;
  const stepIds = new Set(visibleSteps.map((step) => step.id));
  const [checklist, setChecklist] = useState<ChecklistState>(() =>
    createDefaultChecklistState(boilMinutes ?? undefined)
  );
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadedBatchId, setLoadedBatchId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const saveRevisionRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    setLoadStatus("loading");
    setLoadedBatchId(null);
    setErrorMessage("");

    void (async () => {
      try {
        const response = await fetch(
          `/api/batches/${encodeURIComponent(batchId)}/brew-day-checklist`,
          { credentials: "same-origin", cache: "no-store" }
        );
        const result: { checklist?: unknown; error?: string } =
          await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load batch checklist.");
        }

        const loaded =
          result.checklist === null
            ? createDefaultChecklistState(boilMinutes ?? undefined)
            : parseChecklistState(result.checklist);
        loaded.completed = loaded.completed.filter((id) => stepIds.has(id));
        if (loaded.timer && !stepIds.has(loaded.timer.stepId)) {
          loaded.timer = null;
        }
        if (!active) return;
        setChecklist(loaded);
        setNow(Date.now());
        setLoadedBatchId(batchId);
        setLoadStatus("ready");
      } catch (error) {
        console.error("Could not load batch brew-day checklist", error);
        if (!active) return;
        setErrorMessage(
          messageFromError(error, "Could not load the saved checklist.")
        );
        setLoadStatus("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [batchId, batchType, beerSubtype, boilMinutes, loadAttempt]);

  useEffect(() => {
    if (loadStatus !== "ready" || loadedBatchId !== batchId) return;

    const revision = ++saveRevisionRef.current;
    const payload = JSON.stringify({ version: 1, ...checklist });
    setSaveStatus("saving");
    const timeout = window.setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (revision !== saveRevisionRef.current) return;
          const response = await fetch(
            `/api/batches/${encodeURIComponent(batchId)}/brew-day-checklist`,
            {
              method: "PUT",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: payload,
            }
          );
          const result: { error?: string } = await response.json();
          if (!response.ok) {
            throw new Error(result.error || "Could not save batch checklist.");
          }
          if (revision === saveRevisionRef.current) {
            setErrorMessage("");
            setSaveStatus("saved");
          }
        })
        .catch((error: unknown) => {
          console.error("Could not save batch brew-day checklist", error);
          if (revision === saveRevisionRef.current) {
            setErrorMessage(
              messageFromError(error, "Could not save checklist progress.")
            );
            setSaveStatus("error");
          }
        });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [batchId, checklist, loadStatus, loadedBatchId]);

  useEffect(() => {
    if (!checklist.timer || checklist.timer.endsAt === null) return;
    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      setChecklist((current) => {
        const timer = current.timer;
        if (!timer || timer.endsAt === null || currentTime < timer.endsAt) {
          return current;
        }
        return {
          ...current,
          timer: { ...timer, endsAt: null, remainingMs: 0 },
        };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [checklist.timer]);

  function toggleStep(stepId: string) {
    setChecklist((current) => ({
      ...current,
      completed: current.completed.includes(stepId)
        ? current.completed.filter((id) => id !== stepId)
        : [...current.completed, stepId],
    }));
  }

  function updateDuration(stepId: string, value: string) {
    if (!value.trim()) return;
    const duration = Number(value);
    if (
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > MAX_TIMER_MINUTES
    ) {
      return;
    }
    setChecklist((current) => ({
      ...current,
      durations: { ...current.durations, [stepId]: duration },
    }));
  }

  function startTimer(stepId: string, defaultMinutes: number) {
    const currentTimer =
      checklist.timer?.stepId === stepId &&
      checklist.timer.endsAt === null &&
      checklist.timer.remainingMs > 0
        ? checklist.timer.remainingMs
        : (checklist.durations[stepId] ?? defaultMinutes) * 60_000;
    const now = Date.now();
    setNow(now);
    setChecklist((current) => ({
      ...current,
      timer: {
        stepId,
        endsAt: now + currentTimer,
        remainingMs: currentTimer,
      },
    }));
  }

  function pauseTimer() {
    const timer = checklist.timer;
    if (!timer || timer.endsAt === null) return;
    const remaining = Math.max(0, timer.endsAt - Date.now());
    setChecklist((current) => ({
      ...current,
      timer: current.timer
        ? { ...current.timer, endsAt: null, remainingMs: remaining }
        : null,
    }));
  }

  function resetTimer() {
    setChecklist((current) => ({ ...current, timer: null }));
  }

  const completedCount = checklist.completed.filter((id) => stepIds.has(id)).length;

  if (loadStatus === "loading") {
    return (
      <section
        id="brew-day-checklist"
        aria-labelledby={`brew-day-checklist-title-${batchId}`}
        className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5"
      >
        <h3
          id={`brew-day-checklist-title-${batchId}`}
          className="text-lg font-semibold text-green-300"
        >
          Brew-day checklist
        </h3>
        <p role="status" className="mt-2 text-sm text-white/60">
          Loading checklist for {batchName}…
        </p>
      </section>
    );
  }

  if (loadStatus === "error") {
    return (
      <section
        aria-labelledby={`brew-day-checklist-title-${batchId}`}
        className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5"
      >
        <h3
          id={`brew-day-checklist-title-${batchId}`}
          className="text-lg font-semibold text-green-300"
        >
          Brew-day checklist
        </h3>
        <p role="alert" className="mt-2 text-sm text-amber-200">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          className="mt-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section
      id="brew-day-checklist"
      aria-labelledby={`brew-day-checklist-title-${batchId}`}
      className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3
            id={`brew-day-checklist-title-${batchId}`}
            className="text-lg font-bold text-green-300"
          >
            Brew-day checklist
          </h3>
          <p className="mt-1 text-sm text-white/60">
            {batchName} · {completedCount} of {visibleSteps.length} steps complete
          </p>
        </div>
        <ExpandArrowButton
          expanded={checklistOpen}
          label="brew-day checklist"
          controls={`brew-day-checklist-content-${batchId}`}
          onClick={() => setChecklistOpen((open) => !open)}
        />
      </div>

      {checklistOpen && (
        <div id={`brew-day-checklist-content-${batchId}`} className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p role="status" className="text-white/70">
              {completedCount} of {visibleSteps.length} steps complete
            </p>
            <p className="text-xs text-white/50" aria-live="polite">
              {saveStatus === "saving"
                ? "Saving to this batch…"
                : saveStatus === "error"
                  ? "Progress not saved"
                  : "Progress saved to this batch"}
            </p>
          </div>

          {errorMessage && (
            <p role="alert" className="mb-4 text-sm text-amber-200">
              {errorMessage}
            </p>
          )}

          <ol className="space-y-3">
        {steps.map((step, index) => {
          const complete = checklist.completed.includes(step.id);
          const isTimed = step.timerMinutes !== undefined;
          const stepTimer =
            isTimed && checklist.timer?.stepId === step.id
              ? checklist.timer
              : null;
          const stepRemaining = stepTimer
            ? stepTimer.endsAt === null
              ? stepTimer.remainingMs
              : Math.max(0, stepTimer.endsAt - now)
            : null;
          const stepFinished =
            stepTimer !== null && stepTimer.remainingMs === 0;
          const isRunning = stepTimer !== null && stepTimer.endsAt !== null;

          return (
            <li
              key={step.id}
              className="rounded-lg border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-start gap-3">
                <input
                  id={`brew-day-step-${batchId}-${step.id}`}
                  type="checkbox"
                  checked={complete}
                  onChange={() => toggleStep(step.id)}
                  className="mt-1 h-5 w-5 shrink-0 accent-green-500"
                />
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`brew-day-step-${batchId}-${step.id}`}
                    className={`cursor-pointer font-semibold ${
                      complete ? "text-white/50 line-through" : "text-white"
                    }`}
                  >
                    <span className="mr-2 text-xs text-white/40">
                      {index + 1}.
                    </span>
                    {step.title}
                  </label>
                  <p className="mt-1 text-sm leading-5 text-white/60">
                    {step.description}
                  </p>

                  {isTimed && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-white/60">
                        Timer
                        <input
                          type="number"
                          min="1"
                          max={MAX_TIMER_MINUTES}
                          step="1"
                          value={
                            checklist.durations[step.id] ?? step.timerMinutes
                          }
                          disabled={isRunning}
                          onChange={(event) =>
                            updateDuration(step.id, event.target.value)
                          }
                          aria-label={`${step.title} timer minutes`}
                          className="w-20 rounded border border-white/20 bg-black/40 p-2 text-sm text-white disabled:opacity-50"
                        />
                        min
                      </label>
                      {stepTimer && (
                        <span
                          role={stepFinished ? "status" : undefined}
                          aria-live={stepFinished ? "polite" : undefined}
                          className={`min-w-16 font-mono text-lg font-semibold ${
                            stepFinished ? "text-green-300" : "text-white"
                          }`}
                        >
                          {stepFinished
                            ? "Done"
                            : formatTime(stepRemaining ?? 0)}
                        </span>
                      )}
                      {isRunning ? (
                        <button
                          type="button"
                          onClick={pauseTimer}
                          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            startTimer(step.id, step.timerMinutes ?? 1)
                          }
                          className="rounded-lg border border-green-500 bg-green-700 px-3 py-2 text-sm font-semibold hover:bg-green-600"
                        >
                          {stepTimer && !stepFinished ? "Resume" : "Start timer"}
                        </button>
                      )}
                      {stepTimer && (
                        <button
                          type="button"
                          onClick={resetTimer}
                          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
          </ol>

          {isSecondary && (
            <section
          aria-labelledby={`secondary-checklist-title-${batchId}`}
          className="mt-6 border-t border-white/10 pt-5"
        >
          <h4
            id={`secondary-checklist-title-${batchId}`}
            className="mb-3 text-lg font-semibold text-green-300"
          >
            Secondary fermentation
          </h4>
          <p className="mb-4 text-sm text-white/60">
            Secondary-specific tasks appear here while this batch is in
            secondary fermentation.
          </p>
          <ol className="space-y-3">
            {SECONDARY_FERMENTATION_STEPS.map((step, index) => {
              const complete = checklist.completed.includes(step.id);
              return (
                <li
                  key={step.id}
                  className="rounded-lg border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start gap-3">
                    <input
                      id={`brew-day-step-${batchId}-${step.id}`}
                      type="checkbox"
                      checked={complete}
                      onChange={() => toggleStep(step.id)}
                      className="mt-1 h-5 w-5 shrink-0 accent-green-500"
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`brew-day-step-${batchId}-${step.id}`}
                        className={`cursor-pointer font-semibold ${
                          complete
                            ? "text-white/50 line-through"
                            : "text-white"
                        }`}
                      >
                        <span className="mr-2 text-xs text-white/40">
                          {index + 1}.
                        </span>
                        {step.title}
                      </label>
                      <p className="mt-1 text-sm leading-5 text-white/60">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
            </section>
          )}

          {steps.some((step) => step.timerMinutes !== undefined) && (
            <p className="mt-4 text-xs leading-5 text-white/50">
              Only one timer runs at a time. The countdown continues through
              reloads and when you leave this batch; completion is shown when you
              return.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
