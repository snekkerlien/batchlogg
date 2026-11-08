export default function CalculatorDisclosureArrow() {
  return (
    <span
      aria-hidden="true"
      className="disclosure-arrow flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-transform duration-200"
    >
      <svg
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
    </span>
  );
}
