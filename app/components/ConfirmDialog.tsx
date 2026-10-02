"use client";

import { useEffect, useRef, useState } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => boolean | Promise<boolean>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !confirming) onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, confirming, onCancel]);

  if (!open) return null;

  async function handleConfirm() {
    if (confirming) return;
    setConfirming(true);
    try {
      if (await onConfirm()) onCancel();
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !confirming) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-md rounded-xl border border-white/15 bg-zinc-900 p-6 shadow-2xl"
      >
        <h2 id="confirm-dialog-title" className="mb-3 text-xl font-bold">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="text-sm text-zinc-300">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={confirming}
            onClick={onCancel}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={confirming}
            onClick={handleConfirm}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20 disabled:cursor-wait disabled:opacity-50"
          >
            {confirming ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
