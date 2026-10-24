"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePageGuidesEnabled } from "@/lib/accessibility/usePageGuidesEnabled";

function InventoryIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="h-24 w-24 shrink-0 text-green-300 sm:h-32 sm:w-32"
    >
      <circle cx="60" cy="60" r="55" fill="currentColor" opacity=".07" />
      <circle cx="60" cy="60" r="45" fill="none" stroke="currentColor" opacity=".15" />
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="26" y="23" width="68" height="76" rx="8" />
        <path d="M40 23v-5h40v5M40 43h40M40 61h40M40 79h40" />
        <circle cx="33" cy="34" r="2" fill="currentColor" />
        <circle cx="33" cy="52" r="2" fill="currentColor" />
        <circle cx="33" cy="70" r="2" fill="currentColor" />
        <path d="M42 35h13M42 53h21M42 71h16" />
        <rect x="69" y="47" width="8" height="10" rx="2" fill="currentColor" opacity=".18" />
        <rect x="68" y="65" width="12" height="10" rx="2" fill="currentColor" opacity=".18" />
        <path d="M43 89h34" />
      </g>
    </svg>
  );
}

export default function InventoryGuide() {
  const [open, setOpen] = useState(false);
  const guidesEnabled = usePageGuidesEnabled();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!guidesEnabled) setOpen(false);
  }, [guidesEnabled]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [open]);

  return (
    <>
      {guidesEnabled &&
        typeof document !== "undefined" &&
        createPortal(
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="fixed bottom-4 right-4 z-[90] rounded-full border border-white/15 bg-zinc-950/95 px-4 py-2 text-sm font-semibold text-white/75 shadow-lg hover:border-green-300/40 hover:text-white"
          >
            Inventory guide
          </button>,
          document.body
        )}
      {guidesEnabled &&
        open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
            <section
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="inventory-guide-title"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation();
                  setOpen(false);
                }
                if (event.key !== "Tab") return;
                const controls =
                  dialogRef.current?.querySelectorAll<HTMLElement>(
                    "button:not(:disabled), a[href]"
                  );
                if (!controls?.length) {
                  event.preventDefault();
                  return;
                }
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (
                  event.shiftKey &&
                  (document.activeElement === first ||
                    document.activeElement === dialogRef.current)
                ) {
                  event.preventDefault();
                  last.focus();
                } else if (
                  !event.shiftKey &&
                  (document.activeElement === last ||
                    document.activeElement === dialogRef.current)
                ) {
                  event.preventDefault();
                  first.focus();
                }
              }}
              className="w-full max-w-3xl shrink-0 rounded-2xl border border-white/15 bg-zinc-950 text-white shadow-2xl outline-none"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-300">
                  Inventory guide
                </p>
                <button
                  type="button"
                  aria-label="Close inventory guide"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-lg leading-none text-white/60 hover:bg-white/10 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="p-5 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-green-300">
                      Keep your brewing supplies in view
                    </p>
                    <h2
                      id="inventory-guide-title"
                      className="mt-3 max-w-lg text-2xl font-bold leading-tight sm:text-3xl"
                    >
                      Your inventory, explained.
                    </h2>
                  </div>
                  <div className="hidden min-[400px]:block">
                    <InventoryIllustration />
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                  Track what you have, find items quickly, and see what may need
                  restocking.
                </p>

                <section aria-labelledby="inventory-guide-tools" className="mt-7">
                  <h3
                    id="inventory-guide-tools"
                    className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/45"
                  >
                    Inventory tools
                  </h3>
                  <ul className="grid gap-3 text-sm leading-6 text-white/65 sm:grid-cols-2">
                    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <strong className="text-sm font-semibold text-green-200">
                        Add and update stock
                      </strong>
                      <p className="mt-1">
                        Add items with a category, amount, unit, and minimum.
                        Update current stock to match what you have on hand.
                      </p>
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <strong className="text-sm font-semibold text-green-200">
                        Search and filter
                      </strong>
                      <p className="mt-1">
                        Search by item or category, then filter by category or
                        stock level.
                      </p>
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <strong className="text-sm font-semibold text-green-200">
                        Categories
                      </strong>
                      <p className="mt-1">
                        Open a category card to browse its items and make
                        changes.
                      </p>
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <strong className="text-sm font-semibold text-green-200">
                        Low stock and restocking
                      </strong>
                      <p className="mt-1">
                        Items at or below their minimum appear under Low stock.
                        Premium can add them to your shopping list without
                        changing the recorded amount.
                      </p>
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:col-span-2">
                      <strong className="text-sm font-semibold text-green-200">
                        Recent stock history
                      </strong>
                      <p className="mt-1">
                        Expand the history at the bottom to review stock
                        increases, adjustments, and ingredient use.
                      </p>
                    </li>
                  </ul>
                </section>

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                  <p className="text-xs text-white/40">
                    Keep your stock record up to date as you brew.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
                  >
                    Back to inventory
                  </button>
                </div>
              </div>
            </section>
          </div>,
          document.body
        )}
    </>
  );
}
