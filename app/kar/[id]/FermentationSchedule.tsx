"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type ScheduleStep = {
  id: string;
  title: string;
  notes: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  reminder_id: string | null;
};

export default function FermentationSchedule({ batchId }: { batchId: string }) {
  const [steps, setSteps] = useState<ScheduleStep[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadSchedule() {
    const response = await fetch(
      `/api/fermentation-schedule?batchId=${encodeURIComponent(batchId)}`,
      { credentials: "include", cache: "no-store" }
    );
    const result: { steps?: ScheduleStep[]; error?: string } = await response.json();
    if (response.status === 403) {
      setPremiumRequired(true);
      return;
    }
    if (!response.ok) throw new Error(result.error || "Could not load schedule");
    setPremiumRequired(false);
    setSteps(result.steps ?? []);
  }

  useEffect(() => {
    let active = true;
    loadSchedule()
      .catch((loadError) => {
        console.error("Could not load fermentation schedule", loadError);
        if (active) setError("Fermentation schedule could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [batchId]);

  async function addStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/fermentation-schedule", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          title,
          notes,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const result: { step?: ScheduleStep; error?: string } = await response.json();
      if (response.status === 403) setPremiumRequired(true);
      if (!response.ok) throw new Error(result.error || "Could not add schedule step");
      setTitle("");
      setNotes("");
      setScheduledAt("");
      await loadSchedule();
    } catch (saveError) {
      console.error("Could not add fermentation schedule step", saveError);
      setError(saveError instanceof Error ? saveError.message : "Could not add schedule step.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStep(step: ScheduleStep) {
    setError("");
    try {
      const response = await fetch("/api/fermentation-schedule", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          id: step.id,
          completed: !step.completed_at,
        }),
      });
      const result: { error?: string } = await response.json();
      if (response.status === 403) setPremiumRequired(true);
      if (!response.ok) throw new Error(result.error || "Could not update schedule step");
      await loadSchedule();
    } catch (updateError) {
      console.error("Could not update fermentation schedule step", updateError);
      setError(updateError instanceof Error ? updateError.message : "Could not update step.");
    }
  }

  async function removeStep(step: ScheduleStep) {
    setError("");
    try {
      const response = await fetch(
        `/api/fermentation-schedule?batchId=${encodeURIComponent(batchId)}&stepId=${encodeURIComponent(step.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const result: { error?: string } = await response.json();
      if (response.status === 403) setPremiumRequired(true);
      if (!response.ok) throw new Error(result.error || "Could not remove schedule step");
      await loadSchedule();
    } catch (deleteError) {
      console.error("Could not remove fermentation schedule step", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Could not remove step.");
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-lg font-semibold text-green-200">Fermentation schedule</h3>
      {premiumRequired ? (
        <p className="text-sm text-white/75">
          Custom fermentation stages and reminders are Premium features.{" "}
          <Link href="/premium" className="text-green-200 underline">Explore Premium</Link>
        </p>
      ) : loading ? (
        <p className="text-sm text-white/60">Loading schedule…</p>
      ) : (
        <>
          {steps.length > 0 ? (
            <ol className="mb-5 space-y-2">
              {steps.map((step) => (
                <li key={step.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                  <input
                    type="checkbox"
                    checked={Boolean(step.completed_at)}
                    onChange={() => void toggleStep(step)}
                    aria-label={`Mark ${step.title} ${step.completed_at ? "incomplete" : "complete"}`}
                    className="mt-1 accent-green-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={step.completed_at ? "font-medium text-white/50 line-through" : "font-medium"}>
                      {step.title}
                    </p>
                    {step.scheduled_at && (
                      <p className="text-xs text-white/60">
                        {new Date(step.scheduled_at).toLocaleString()}
                        {step.reminder_id && !step.completed_at ? " · Reminder set" : ""}
                      </p>
                    )}
                    {step.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-white/65">{step.notes}</p>}
                  </div>
                  <button type="button" onClick={() => void removeStep(step)} className="text-sm text-red-300 hover:text-red-200">
                    Remove
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mb-4 text-sm text-white/60">No fermentation stages added yet.</p>
          )}
          <form onSubmit={addStep} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-white/75">
              Stage
              <input
                required
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Raise fermentation temperature"
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
              />
            </label>
            <label className="text-sm text-white/75">
              Reminder date and time (optional)
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
              />
            </label>
            <label className="text-sm text-white/75 sm:col-span-2">
              Notes (optional)
              <textarea
                maxLength={2000}
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
              />
            </label>
            <button
              type="submit"
              disabled={busy || steps.length >= 50}
              className="rounded-lg border border-green-500/40 bg-green-800/60 px-4 py-2 font-semibold disabled:opacity-50 sm:col-span-2"
            >
              {busy ? "Adding…" : "Add fermentation stage"}
            </button>
          </form>
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    </section>
  );
}
