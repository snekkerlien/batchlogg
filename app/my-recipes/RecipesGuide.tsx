"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePageGuidesEnabled } from "@/lib/accessibility/usePageGuidesEnabled";

function RecipesIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="h-24 w-24 shrink-0 text-green-300 sm:h-32 sm:w-32"
    >
      <circle cx="60" cy="60" r="55" fill="currentColor" opacity=".07" />
      <circle cx="60" cy="60" r="45" fill="none" stroke="currentColor" opacity=".15" />
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M35 25h43l9 9v58a5 5 0 0 1-5 5H35a5 5 0 0 1-5-5V30a5 5 0 0 1 5-5Z" />
        <path d="M78 25v12h12M42 49h37M42 62h37M42 75h22" />
        <path d="m73 77 4 4 9-10M42 86h18" />
        <circle cx="42" cy="49" r="1.5" fill="currentColor" />
        <circle cx="42" cy="62" r="1.5" fill="currentColor" />
      </g>
    </svg>
  );
}

export default function RecipesGuide() {
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
            My recipes guide
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
              aria-labelledby="recipes-guide-title"
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
                  My recipes guide
                </p>
                <button
                  type="button"
                  aria-label="Close My recipes guide"
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
                      Save ideas and brew from your plans
                    </p>
                    <h2
                      id="recipes-guide-title"
                      className="mt-3 max-w-lg text-2xl font-bold leading-tight sm:text-3xl"
                    >
                      Your recipes, explained.
                    </h2>
                  </div>
                  <div className="hidden min-[400px]:block">
                    <RecipesIllustration />
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                  Create and organize recipes, then use one to start a batch
                  when you’re ready.
                </p>

                <section aria-labelledby="recipes-guide-tools" className="mt-7">
                  <h3
                    id="recipes-guide-tools"
                    className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/45"
                  >
                    Recipe tools
                  </h3>
                  <ul className="grid gap-3 text-sm leading-6 text-white/65 sm:grid-cols-2">
                    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <strong className="text-sm font-semibold text-green-200">
                        Create a recipe
                      </strong>
                      <p className="mt-1">
                        Choose New recipe, select a beverage type, and enter
                        your ingredients and process.
                      </p>
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <strong className="text-sm font-semibold text-green-200">
                        Import a recipe
                      </strong>
                      <p className="mt-1">
                        Import CSV, BeerXML, or BeerJSON files. Imported
                        recipes stay private.
                      </p>
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <strong className="text-sm font-semibold text-green-200">
                        Find and compare
                      </strong>
                      <p className="mt-1">
                        Search, filter by beverage type, or sort your recipes.
                        Open a recipe to see its details.
                      </p>
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <strong className="text-sm font-semibold text-green-200">
                        Start a batch
                      </strong>
                      <p className="mt-1">
                        Choose a recipe and an empty vessel to start brewing.
                        You can review any inventory warnings before continuing.
                      </p>
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:col-span-2">
                      <strong className="text-sm font-semibold text-green-200">
                        Manage and share
                      </strong>
                      <p className="mt-1">
                        Expand a recipe to edit it, change its visibility, or
                        delete it. Recipes are private unless you make them
                        public.
                      </p>
                    </li>
                  </ul>
                </section>

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                  <p className="text-xs text-white/40">
                    Build a collection you can brew from again.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
                  >
                    Back to my recipes
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
