"use client";

export default function ExpandArrowButton({
  expanded,
  label,
  onClick,
  controls,
}: {
  expanded: boolean;
  label: string;
  onClick: () => void;
  controls?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-base text-white/70 transition-transform duration-200 hover:bg-white/10 ${
        expanded ? "rotate-90" : "rotate-180"
      }`}
    >
      ▶
    </button>
  );
}
