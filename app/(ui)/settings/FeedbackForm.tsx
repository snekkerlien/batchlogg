"use client";

import { useState } from "react";
import { submitFeedback } from "@/app/actions/feedback";

export default function FeedbackForm() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.set("category", category);
      formData.set("message", message);

      await submitFeedback(formData);

      setMessage("");
      setOpen(false);
      setStatus({ ok: true, text: "Thanks! Your message was sent." });
    } catch (error) {
      console.error("Could not send feedback", error);
      setStatus({ ok: false, text: "Could not send your message. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {!open && (
        <button
          type="button"
          onClick={() => {
            setStatus(null);
            setOpen(true);
          }}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
        >
          Feedback &amp; suggestions
        </button>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="p-3 rounded bg-black/40 border border-white/20"
          >
            <option value="suggestion">Suggestion</option>
            <option value="feedback">General feedback</option>
            <option value="bug">Bug report</option>
          </select>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={3}
            maxLength={3000}
            rows={5}
            placeholder="What's on your mind?"
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sending}
              className="flex-1 px-3 py-2 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold text-sm disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send"}
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={sending}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {status && (
        <p
          role={status.ok ? "status" : "alert"}
          className={`text-center text-sm ${status.ok ? "text-green-300" : "text-red-400"}`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
