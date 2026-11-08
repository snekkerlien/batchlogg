"use client";

export default function ExpandArrowButton({
  expanded,
  label,
  onClick,
  controls,
  expandedAriaLabel,
  collapsedAriaLabel,
}: {
  expanded: boolean;
  label: string;
  onClick: () => void;
  controls?: string;
  expandedAriaLabel?: string;
  collapsedAriaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={
        expanded
          ? expandedAriaLabel ?? `Collapse ${label}`
          : collapsedAriaLabel ?? `Expand ${label}`
      }
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-transform duration-200 hover:bg-white/10 ${
        expanded ? "rotate-90" : "rotate-0"
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
      >
        <path
          d="m9 18 6-6-6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
