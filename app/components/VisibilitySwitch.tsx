"use client";

interface VisibilitySwitchProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  publicText?: string;
  privateText?: string;
  ariaLabel: string;
  className?: string;
}

export default function VisibilitySwitch({
  checked,
  onChange,
  label,
  publicText = "visible",
  privateText = "hidden",
  ariaLabel,
  className = "",
}: VisibilitySwitchProps) {
  return (
    <div className={`inline-flex items-center justify-center gap-3 ${className}`}>
      {label && <span className="text-sm opacity-80">{label}</span>}
      <span className="text-sm opacity-80">{checked ? publicText : privateText}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={onChange}
        className={`relative h-7 w-14 shrink-0 rounded-full transition ${
          checked ? "bg-green-500" : "bg-zinc-600"
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? "translate-x-7" : ""
          }`}
        />
      </button>
    </div>
  );
}
