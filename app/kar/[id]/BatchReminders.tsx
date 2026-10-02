"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

interface BatchReminder {
  id: string;
  type: "manual" | "sg_check";
  message: string;
  remind_at: string;
}

function localDateTimeValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default function BatchReminders({
  batchId,
}: {
  batchId: string;
}) {
  const [reminders, setReminders] = useState<BatchReminder[]>([]);
  const [remindAt, setRemindAt] = useState(() =>
    localDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [reminderToDelete, setReminderToDelete] = useState<BatchReminder | null>(null);

  const loadReminders = useCallback(async () => {
    const response = await fetch(
      `/api/batch-reminders?batch_id=${encodeURIComponent(batchId)}`,
      { cache: "no-store", credentials: "include" }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not load reminders");
    }
    setReminders(data.reminders);
    setError("");
  }, [batchId]);

  useEffect(() => {
    let active = true;
    loadReminders()
      .catch((loadError) => {
        console.error("Could not load batch reminders", loadError);
        if (active) setError("Reminders could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadReminders]);

  async function createReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/batch-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          batchId,
          remindAt: new Date(remindAt).toISOString(),
          message,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create reminder");

      setMessage("");
      try {
        await loadReminders();
      } catch (refreshError) {
        console.error("Reminder was saved, but its list could not refresh", refreshError);
        setError("Reminder was saved, but the scheduled list could not be refreshed.");
      }
    } catch (saveError) {
      console.error("Could not create batch reminder", saveError);
      setError(
        saveError instanceof Error ? saveError.message : "Could not create reminder."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteReminder() {
    if (!reminderToDelete) return false;

    try {
      const response = await fetch(
        `/api/batch-reminders?id=${encodeURIComponent(reminderToDelete.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete reminder");
      setReminders((current) =>
        current.filter((reminder) => reminder.id !== reminderToDelete.id)
      );
      setReminderToDelete(null);
      setDeleteError("");
      setError("");
      return true;
    } catch (deleteError) {
      console.error("Could not delete batch reminder", deleteError);
      setError(
        deleteError instanceof Error ? deleteError.message : "Could not delete reminder."
      );
      setDeleteError(
        deleteError instanceof Error ? deleteError.message : "Could not delete reminder."
      );
      return false;
    }
  }

  return (
    <section className="mt-6 mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-xl font-semibold text-green-300">Batch reminders</h2>
      <p className="mt-1 text-sm text-white/70">
        Set a reminder for this batch. You’ll also be gently reminded if it goes
        7 days without a gravity reading.
      </p>

      <form onSubmit={createReminder} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Reminder date and time
          <input
            type="datetime-local"
            required
            min={localDateTimeValue(new Date())}
            value={remindAt}
            onChange={(event) => setRemindAt(event.target.value)}
            className="rounded-lg border border-white/20 bg-black/40 p-3 text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          What should we remind you about?
          <input
            type="text"
            required
            maxLength={300}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="For example, check gravity or prepare to bottle"
            className="rounded-lg border border-white/20 bg-black/40 p-3 text-white"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-lg border border-green-500/50 bg-green-700/70 px-4 py-2 font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Set reminder"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-amber-300">
          {error}
        </p>
      )}

      <div className="mt-5 border-t border-white/10 pt-4">
        <h3 className="font-semibold">Scheduled reminders</h3>
        {loading ? (
          <p className="mt-2 text-sm text-white/60">Loading reminders…</p>
        ) : reminders.length === 0 ? (
          <p className="mt-2 text-sm text-white/60">No reminders scheduled.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="flex flex-col gap-2 rounded-lg bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm">{reminder.message}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {reminder.type === "manual" ? "Scheduled" : "Gravity check"} ·{" "}
                    {new Date(reminder.remind_at).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                {reminder.type === "manual" && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError("");
                      setReminderToDelete(reminder);
                    }}
                    className="w-fit rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
                  >
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!reminderToDelete}
        title="Cancel this reminder?"
        message={deleteError || "This scheduled reminder will be removed."}
        confirmLabel="Cancel reminder"
        onConfirm={deleteReminder}
        onCancel={() => {
          setReminderToDelete(null);
          setDeleteError("");
        }}
      />
    </section>
  );
}
