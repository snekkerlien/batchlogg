"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ExpandArrowButton from "@/app/components/ExpandArrowButton";

interface BatchReminder {
  id: string;
  type: "manual" | "sg_check";
  message: string;
  remind_at: string;
  read_at: string | null;
}

function localDateTimeValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default function BatchReminders({
  batchId,
  stage,
}: {
  batchId: string;
  stage: "primary" | "secondary";
}) {
  const [reminders, setReminders] = useState<BatchReminder[]>([]);
  const [remindAt, setRemindAt] = useState(() =>
    localDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [reminderToDelete, setReminderToDelete] = useState<BatchReminder | null>(null);
  const stageLabel =
    stage === "secondary" ? "Secondary fermentation" : "Primary fermentation";
  const suggestedReminders =
    stage === "secondary"
      ? [
          "Check gravity before packaging",
          "Check for clearing",
          "Schedule rack or transfer",
          "Prepare packaging",
          "Check carbonation",
        ]
      : [
          "Take a gravity reading",
          "Check fermentation temperature",
          "Check fermentation activity",
          "Schedule nutrient addition",
          "Schedule rack or transfer",
        ];

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

  useEffect(() => {
    function openFromGuide() {
      if (window.location.hash !== "#batch-reminders-content") return;
      setOpen(true);
      document
        .getElementById("batch-reminders")
        ?.scrollIntoView({ block: "start" });
    }
    openFromGuide();
    window.addEventListener("hashchange", openFromGuide);
    return () => window.removeEventListener("hashchange", openFromGuide);
  }, [batchId]);

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
    <section id="batch-reminders" className="mt-6 mb-6 scroll-mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex w-full items-center justify-between gap-3 text-left text-lg font-semibold text-green-300">
        <span>{stageLabel} reminders</span>
        <ExpandArrowButton
          expanded={open}
          label="batch reminders"
          controls="batch-reminders-content"
          onClick={() => setOpen((current) => !current)}
        />
      </div>
      <div
        id="batch-reminders-content"
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="mt-1 text-sm text-white/70">
            Set a reminder for this stage of the batch. We’ll also remind you if
            7 days pass without a gravity reading.
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
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              {suggestedReminders.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setMessage(suggestion)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75 hover:bg-white/10"
                >
                  {suggestion}
                </button>
              ))}
            </div>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm">{reminder.message}</p>
                        {new Date(reminder.remind_at).getTime() <= Date.now() && (
                          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[11px] font-semibold text-amber-100">
                            Due
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        {reminder.type === "manual"
                          ? "Scheduled task"
                          : reminder.message.includes("stayed within 0.001")
                            ? "Stable gravity trend"
                            : "Gravity check"}{" "}
                        ·{" "}
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
        </div>
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
