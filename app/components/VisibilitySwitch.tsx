"use client";

interface VisibilitySwitchProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  publicText?: string;
  privateText?: string;
  ariaLabel: string;
  className?: string;
  compact?: boolean;
}

export default function VisibilitySwitch({
  checked,
  onChange,
  label,
  publicText = "visible",
  privateText = "hidden",
  ariaLabel,
  className = "",
  compact = false,
}: VisibilitySwitchProps) {
  return (
    <div className={`inline-flex items-center justify-center ${compact ? "gap-1.5" : "gap-3"} ${className}`}>
      {label && <span className={`${compact ? "text-xs" : "text-sm"} opacity-80`}>{label}</span>}
      <span className={`${compact ? "text-xs" : "text-sm"} opacity-80`}>{checked ? publicText : privateText}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={onChange}
        className={`relative ${compact ? "h-6 w-12" : "h-7 w-14"} shrink-0 rounded-full transition ${
          checked ? "bg-green-500" : "bg-zinc-600"
        }`}
      >
        <span
          className={`absolute left-1 top-1 ${compact ? "h-4 w-4" : "h-5 w-5"} rounded-full bg-white transition ${
            checked ? (compact ? "translate-x-6" : "translate-x-7") : ""
          }`}
        />
      </button>
    </div>
  );
}
