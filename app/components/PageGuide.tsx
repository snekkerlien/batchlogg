"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePageGuidesEnabled } from "@/lib/accessibility/usePageGuidesEnabled";

export type PageGuideSection = {
  title: string;
  description: string;
};

type PageGuideProps = {
  buttonLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  sectionHeading: string;
  sections: PageGuideSection[];
  illustration:
    | "insights"
    | "academy"
    | "calculators"
    | "calendar"
    | "history"
    | "shopping";
  footer: string;
};

function GuideIllustration({
  variant,
}: {
  variant: PageGuideProps["illustration"];
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="h-24 w-24 shrink-0 text-green-300 sm:h-32 sm:w-32"
    >
      <circle cx="60" cy="60" r="55" fill="currentColor" opacity=".07" />
      <circle cx="60" cy="60" r="45" fill="none" stroke="currentColor" opacity=".15" />
      {variant === "calendar" ? (
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="24" y="29" width="72" height="67" rx="7" />
          <path d="M24 47h72M42 22v14M78 22v14" />
          <rect x="36" y="58" width="10" height="9" rx="2" fill="currentColor" opacity=".2" />
          <rect x="55" y="58" width="10" height="9" rx="2" fill="currentColor" opacity=".2" />
          <rect x="74" y="58" width="10" height="9" rx="2" fill="currentColor" opacity=".2" />
          <path d="M39 78h8M58 78h8M77 78h6" />
        </g>
      ) : variant === "history" ? (
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M29 42a34 34 0 1 1-3 27M24 28v16h16" />
          <path d="M60 40v22l15 9" />
          <circle cx="60" cy="62" r="3" fill="currentColor" />
        </g>
      ) : variant === "shopping" ? (
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M31 39h58l-6 50H37zM27 30h66M47 39V29a13 13 0 0 1 26 0v10" />
          <path d="m47 62 8 8 18-19" />
          <path d="M43 89v7M77 89v7" />
        </g>
      ) : variant === "insights" ? (
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M28 88V32M28 88h66" />
          <rect x="39" y="64" width="12" height="24" rx="2" fill="currentColor" opacity=".18" />
          <rect x="58" y="51" width="12" height="37" rx="2" fill="currentColor" opacity=".18" />
          <rect x="77" y="38" width="12" height="50" rx="2" fill="currentColor" opacity=".18" />
          <path d="m39 54 16-10 15 3 19-16M81 31h8v8" />
        </g>
      ) : variant === "academy" ? (
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m60 22 39 20-39 20-39-20z" fill="currentColor" opacity=".12" />
          <path d="M37 54v20c12 12 34 12 46 0V54M99 42v27" />
          <circle cx="99" cy="73" r="4" fill="currentColor" opacity=".6" />
          <path d="M48 82v10M72 82v10M48 92h24" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="31" y="20" width="58" height="80" rx="8" />
          <rect x="42" y="31" width="36" height="14" rx="3" fill="currentColor" opacity=".14" />
          <path d="M43 58h6M60 58h6M77 58h1M43 73h6M60 73h6M77 73h1M43 88h6M60 88h6M77 88h1" />
        </g>
      )}
    </svg>
  );
}

export default function PageGuide({
  buttonLabel,
  eyebrow,
  title,
  description,
  sectionHeading,
  sections,
  illustration,
  footer,
}: PageGuideProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const guidesEnabled = usePageGuidesEnabled();
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = `${buttonLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`;

  useEffect(() => {
    setMounted(true);
  }, []);

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
      {mounted &&
        guidesEnabled &&
        createPortal(
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="fixed bottom-4 right-4 z-[90] rounded-full border border-white/15 bg-zinc-950/95 px-4 py-2 text-sm font-semibold text-white/75 shadow-lg hover:border-green-300/40 hover:text-white"
          >
            {buttonLabel}
          </button>,
          document.body
        )}
      {mounted &&
        guidesEnabled &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
            <section
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
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
                  {buttonLabel}
                </p>
                <button
                  type="button"
                  aria-label={`Close ${buttonLabel}`}
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
                      {eyebrow}
                    </p>
                    <h2
                      id={titleId}
                      className="mt-3 max-w-lg text-2xl font-bold leading-tight sm:text-3xl"
                    >
                      {title}
                    </h2>
                  </div>
                  <div className="hidden min-[400px]:block">
                    <GuideIllustration variant={illustration} />
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                  {description}
                </p>
                <section aria-label={sectionHeading} className="mt-7">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/45">
                    {sectionHeading}
                  </h3>
                  <ul className="grid gap-3 text-sm leading-6 text-white/65 sm:grid-cols-2">
                    {sections.map((section) => (
                      <li
                        key={section.title}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <strong className="text-sm font-semibold text-green-200">
                          {section.title}
                        </strong>
                        <p className="mt-1">{section.description}</p>
                      </li>
                    ))}
                  </ul>
                </section>
                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                  <p className="text-xs text-white/40">{footer}</p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
                  >
                    Got it
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
