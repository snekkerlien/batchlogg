"use client";

import { FormEvent, useState } from "react";

type ReportableContent = "post" | "reply" | "message" | "recipe" | "batch" | "profile";
const MAX_EVIDENCE_FILES = 3;
const MAX_EVIDENCE_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ReportContentButton({
  contentType,
  contentId,
  contextUrl,
}: {
  contentType: ReportableContent;
  contentId: string;
  contextUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("other");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("contentType", contentType);
      formData.set("contentId", contentId);
      formData.set("contextUrl", contextUrl);
      formData.set("category", category);
      formData.set("reason", reason);
      evidence.forEach((file) => formData.append("evidence", file));
      const response = await fetch("/api/community/reports", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit report");
      setSubmitted(true);
      setOpen(false);
      setReason("");
      setEvidence([]);
    } catch (submitError) {
      console.error("Could not submit content report", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit report."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <span className="text-xs text-green-300">Reported</span>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen((value) => !value);
        }}
        className="text-xs text-white/50 underline underline-offset-2 hover:text-white"
      >
        Report
      </button>
      {open && (
        <form
          onSubmit={submit}
          className="mt-3 w-full max-w-md space-y-3 rounded-lg border border-white/10 bg-black/40 p-3"
        >
          <label className="block text-left text-xs text-white/70">
            Reason
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1 w-full rounded border border-white/20 bg-zinc-900 p-2 text-sm"
            >
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-left text-xs text-white/70">
            Details
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={10}
              maxLength={2000}
              required
              rows={3}
              className="mt-1 w-full rounded border border-white/20 bg-zinc-900 p-2 text-sm"
            />
          </label>
          <label className="block text-left text-xs text-white/70">
            Screenshot evidence (optional, up to {MAX_EVIDENCE_FILES} images)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={submitting}
              onChange={(event) => {
                const selected = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = "";
                if (evidence.length + selected.length > MAX_EVIDENCE_FILES) {
                  setError(`You can attach up to ${MAX_EVIDENCE_FILES} screenshots.`);
                  return;
                }
                if (selected.some((file) => !ALLOWED_EVIDENCE_TYPES.has(file.type))) {
                  setError("Evidence must be JPEG, PNG, or WebP images.");
                  return;
                }
                if (selected.some((file) => file.size === 0 || file.size > MAX_EVIDENCE_FILE_SIZE)) {
                  setError("Each screenshot must be smaller than 5 MB.");
                  return;
                }
                setError("");
                setEvidence((current) => [...current, ...selected]);
              }}
              className="mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-white"
            />
          </label>
          {evidence.length > 0 && (
            <ul className="space-y-1 text-xs text-white/60">
              {evidence.map((file, index) => (
                <li key={`${file.name}-${file.size}-${index}`} className="flex justify-between gap-2">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setEvidence((current) => current.filter((_, i) => i !== index))}
                    className="shrink-0 underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={submitting || reason.trim().length < 10}
            className="rounded border border-green-500/40 bg-green-700/70 px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </form>
      )}
    </div>
  );
}
