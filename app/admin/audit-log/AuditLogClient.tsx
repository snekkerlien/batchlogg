"use client";

import { useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

interface AuditEvent {
  id: string | number;
  actor_name: string;
  action: string;
  action_label: string;
  target_type: string;
  target_id: string | null;
  details: string | null;
  created_at: string;
}

export default function AuditLogClient({
  events: initialEvents,
}: {
  events: AuditEvent[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [eventToDelete, setEventToDelete] = useState<AuditEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function deleteEvent() {
    if (!eventToDelete || deleting) return false;
    setDeleting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/audit-log", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: eventToDelete.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not delete audit log entry.");
      }
      setEvents((current) => current.filter((event) => event.id !== eventToDelete.id));
      if (data.warning) setNotice(data.warning);
      return true;
    } catch (deleteError) {
      console.error("Could not delete audit log entry", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete audit log entry."
      );
      return false;
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 text-sm text-amber-200">
          {notice}
        </p>
      )}
      {!events.length ? (
        <p className="text-center text-white/60">
          No administrative actions have been recorded yet.
        </p>
      ) : (
        <ol className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <h2 className="font-semibold text-white">{event.action_label}</h2>
                <div className="flex items-center gap-3">
                  <time
                    dateTime={event.created_at}
                    className="text-sm text-white/50"
                  >
                    {new Date(event.created_at).toLocaleString("en-GB")}
                  </time>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      setError("");
                      setEventToDelete(event);
                    }}
                    className="rounded-lg border border-red-400/30 bg-red-900/20 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-900/40 disabled:cursor-wait disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-white/70">
                {event.actor_name} · {event.target_type}
                {event.target_id ? ` · ${event.target_id}` : ""}
              </p>
              {event.details && (
                <p className="mt-2 break-words text-sm text-white/50">
                  {event.details}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
      <ConfirmDialog
        open={eventToDelete !== null}
        title="Delete audit log entry?"
        message="This permanently removes the selected entry from the audit log."
        confirmLabel="Delete entry"
        onConfirm={deleteEvent}
        onCancel={() => setEventToDelete(null)}
      />
    </>
  );
}
