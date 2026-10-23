import type { ReactNode } from "react";

export default function CalculatorResult({
  name,
  inputs,
  error,
  hasResult,
  assumptions,
  onReset,
  children,
  resetDisabled = false,
}: {
  name: string;
  inputs: Record<string, string>;
  error: string | null;
  hasResult: boolean;
  assumptions: ReactNode;
  onReset: () => void;
  children: ReactNode;
  resetDisabled?: boolean;
}) {
  const missing = Object.entries(inputs)
    .filter(([, value]) => !value.trim())
    .map(([label]) => label);
  const validationError = error || (missing.length === 0 && !hasResult
    ? "These values cannot produce a finite result. Check the ranges and combination."
    : null);
  const ready = !validationError && missing.length === 0 && hasResult;

  return (
    <div className="mt-5 space-y-3">
      <section
        aria-label={`${name} result`}
        role={validationError ? "alert" : "status"}
        aria-atomic="true"
        className={`rounded-lg border p-4 ${
          validationError
            ? "border-amber-300/30 bg-amber-300/5"
            : ready
              ? "border-green-300/30 bg-green-300/5"
              : "border-white/10 bg-black/20"
        }`}
      >
        <h3 className="mb-2 text-sm font-semibold text-white/80">
          {validationError ? "Check your inputs" : ready ? "Calculated result" : "Waiting for input"}
        </h3>
        {validationError ? (
          <p className="text-sm text-amber-200">{validationError}</p>
        ) : missing.length > 0 ? (
          <p className="text-sm text-white/65">
            Still needed: {missing.join(", ")}. Enter 0 where a value is zero; blanks are not treated as zero.
          </p>
        ) : (
          children
        )}
        {ready && (
          <div className="mt-3 text-xs leading-5 text-white/65">
            <strong>Assumptions: </strong>{assumptions}
          </div>
        )}
      </section>
      <div className="text-right">
        <button
          type="button"
          aria-label={`Reset ${name}`}
          disabled={resetDisabled}
          onClick={onReset}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          Reset calculator
        </button>
      </div>
    </div>
  );
}
