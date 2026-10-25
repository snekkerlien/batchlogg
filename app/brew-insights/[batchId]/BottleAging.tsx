"use client";

import { FormEvent, useEffect, useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

type Aging = {
  id: string;
  started_at: string;
  target_tasting_date: string | null;
  reminder_id: string | null;
  completed_at: string | null;
};

type Tasting = {
  id: string;
  tasted_at: string;
  notes: string;
  created_at: string;
};

function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function localDateTimeValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default function BottleAging({ batchId }: { batchId: string }) {
  const [aging, setAging] = useState<Aging | null>(null);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [reminderAtSaved, setReminderAtSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStartForm, setShowStartForm] = useState(false);
  const [targetDate, setTargetDate] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [tastedAt, setTastedAt] = useState(todayDate);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetch(`/api/batches/${encodeURIComponent(batchId)}/aging`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        const result: {
          aging?: Aging | null;
          tastings?: Tasting[];
          reminder?: { remind_at: string } | null;
          error?: string;
        } = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load bottle aging.");
        if (active) {
          setAging(result.aging ?? null);
          setTastings(result.tastings ?? []);
          setReminderAtSaved(result.reminder?.remind_at ?? null);
        }
      })
      .catch((loadError: unknown) => {
        console.error("Could not load bottle aging", loadError);
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load bottle aging.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [batchId]);

  async function request(
    method: "POST" | "PATCH",
    body: Record<string, string>
  ) {
    const response = await fetch(`/api/batches/${encodeURIComponent(batchId)}/aging`, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result: {
      aging?: Aging;
      tasting?: Tasting;
      error?: string;
    } = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save bottle aging.");
    return result;
  }

  async function startAging(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await request("POST", {
        targetTastingDate: targetDate,
        remindAt: remindAt ? new Date(remindAt).toISOString() : "",
      });
      setAging(result.aging ?? null);
      setReminderAtSaved(remindAt ? new Date(remindAt).toISOString() : null);
      setShowStartForm(false);
    } catch (saveError) {
      console.error("Could not start bottle aging", saveError);
      setError(saveError instanceof Error ? saveError.message : "Could not start bottle aging.");
    } finally {
      setSaving(false);
    }
  }

  async function addTasting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await request("POST", {
        action: "tasting",
        tastedAt,
        notes,
      });
      if (result.tasting) {
        setTastings((current) =>
          [...current, result.tasting!].sort((a, b) =>
            b.tasted_at.localeCompare(a.tasted_at)
          )
        );
        setNotes("");
        setTastedAt(todayDate());
      }
    } catch (saveError) {
      console.error("Could not save bottle aging tasting", saveError);
      setError(saveError instanceof Error ? saveError.message : "Could not save tasting notes.");
    } finally {
      setSaving(false);
    }
  }

  async function completeAging() {
    setSaving(true);
    setError("");
    try {
      await request("PATCH", { action: "complete" });
      setAging((current) =>
        current ? { ...current, completed_at: new Date().toISOString() } : current
      );
      setConfirmComplete(false);
      return true;
    } catch (saveError) {
      console.error("Could not complete bottle aging", saveError);
      setError(saveError instanceof Error ? saveError.message : "Could not complete bottle aging.");
      setConfirmComplete(false);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-lg font-semibold text-green-200">Bottle aging</h2>
      <p className="mt-1 text-sm text-white/65">
        Optional: track how this packaged batch develops over time. Add a target tasting date,
        a reminder, and dated tasting notes.
      </p>

      {loading ? (
        <p role="status" className="mt-4 text-sm text-white/60">Loading bottle aging…</p>
      ) : error && !aging && !showStartForm ? (
        <p role="alert" className="mt-4 text-sm text-amber-200">{error}</p>
      ) : !aging ? (
        showStartForm ? (
          <form onSubmit={startAging} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              Target tasting date (optional)
              <input
                type="date"
                min={todayDate()}
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className="rounded-lg border border-white/20 bg-black/40 p-3 text-white"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Reminder date and time (optional)
              <input
                type="datetime-local"
                min={localDateTimeValue(new Date())}
                value={remindAt}
                onChange={(event) => setRemindAt(event.target.value)}
                className="rounded-lg border border-white/20 bg-black/40 p-3 text-white"
              />
            </label>
            {error && <p role="alert" className="text-sm text-amber-200 sm:col-span-2">{error}</p>}
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border border-green-500 bg-green-700 px-4 py-3 font-semibold hover:bg-green-600 disabled:opacity-60"
              >
                {saving ? "Starting…" : "Start bottle aging"}
              </button>
              <button
                type="button"
                onClick={() => { setShowStartForm(false); setError(""); }}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 font-semibold hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowStartForm(true)}
            className="mt-4 rounded-lg border border-green-500 bg-green-700 px-4 py-3 font-semibold hover:bg-green-600"
          >
            Track bottle aging
          </button>
        )
      ) : (
        <>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <dt className="text-xs uppercase tracking-wide text-white/50">Aging since</dt>
              <dd className="mt-1 text-white/90">{new Date(aging.started_at).toLocaleDateString()}</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <dt className="text-xs uppercase tracking-wide text-white/50">Target tasting</dt>
              <dd className="mt-1 text-white/90">
                {aging.target_tasting_date
                  ? new Date(`${aging.target_tasting_date}T00:00:00`).toLocaleDateString()
                  : "No target date set"}
              </dd>
            </div>
          </dl>

          {aging.reminder_id && !aging.completed_at && (
            <p className="mt-3 text-sm text-green-200">
              Bottle-aging reminder scheduled
              {reminderAtSaved ? ` for ${new Date(reminderAtSaved).toLocaleString()}` : ""}.
            </p>
          )}

          {aging.completed_at ? (
            <p className="mt-4 rounded-lg border border-green-300/20 bg-green-300/5 p-3 text-sm text-green-100">
              Bottle aging marked complete on {new Date(aging.completed_at).toLocaleDateString()}.
            </p>
          ) : (
            <>
              <form onSubmit={addTasting} className="mt-5 grid gap-3">
                <h3 className="font-semibold text-white">Add a tasting</h3>
                <label className="flex flex-col gap-2 text-sm">
                  Tasting date
                  <input
                    type="date"
                    max={todayDate()}
                    required
                    value={tastedAt}
                    onChange={(event) => setTastedAt(event.target.value)}
                    className="rounded-lg border border-white/20 bg-black/40 p-3 text-white sm:max-w-xs"
                  />
                </label>
                <label className="flex w-full flex-col gap-2 text-sm">
                  Tasting notes
                  <textarea
                    required
                    maxLength={2000}
                    rows={6}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="min-h-32 w-full resize-y rounded-lg border border-white/20 bg-black/40 p-3 text-white"
                    placeholder="How has the flavor, aroma, or carbonation changed?"
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg border border-green-500 bg-green-700 px-4 py-3 font-semibold hover:bg-green-600 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save tasting"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setConfirmComplete(true)}
                    className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 font-semibold hover:bg-white/10 disabled:opacity-60"
                  >
                    Mark aging complete
                  </button>
                </div>
              </form>
            </>
          )}

          {error && <p role="alert" className="mt-3 text-sm text-amber-200">{error}</p>}
          <section className="mt-6" aria-label="Bottle aging tasting history">
            <h3 className="font-semibold text-white">Tasting history</h3>
            {tastings.length ? (
              <ol className="mt-3 space-y-3">
                {tastings.map((tasting) => (
                  <li key={tasting.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <time dateTime={tasting.tasted_at} className="text-sm font-semibold text-green-200">
                      {new Date(`${tasting.tasted_at}T00:00:00`).toLocaleDateString()}
                    </time>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">{tasting.notes}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-white/55">No tastings recorded yet.</p>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={confirmComplete}
        title="Mark bottle aging complete?"
        message="This will close the aging record and stop its pending reminder. You will still be able to view the tasting history, but you cannot add more tastings."
        confirmLabel={saving ? "Saving…" : "Mark complete"}
        onConfirm={completeAging}
        onCancel={() => setConfirmComplete(false)}
      />
    </section>
  );
}
