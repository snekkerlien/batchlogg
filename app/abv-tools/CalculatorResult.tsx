"use client";

import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { WATER_ION_LABELS } from "@/lib/brewing/waterChemistry";

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
  const { t } = useTranslation();
  const missing = Object.entries(inputs)
    .filter(([, value]) => !value.trim())
    .map(([label]) => translateCalculatorLabel(label, t));
  const validationError = error || (missing.length === 0 && !hasResult
    ? "These values cannot produce a finite result. Check the ranges and combination."
    : null);
  const ready = !validationError && missing.length === 0 && hasResult;
  const translatedError = validationError
    ? translateValidationError(validationError, t)
    : null;

  return (
    <div className="mt-5 space-y-3">
      <section
        aria-label={t("{name} result").replace("{name}", t(name))}
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
          {validationError ? t("Check your inputs") : ready ? t("Calculated result") : t("Waiting for input")}
        </h3>
        {validationError ? (
          <p className="text-sm text-amber-200">{translatedError}</p>
        ) : missing.length > 0 ? (
          <p className="text-sm text-white/65">
            {t("Still needed: {fields}. Enter 0 where a value is zero; blanks are not treated as zero.").replace("{fields}", missing.join(", "))}
          </p>
        ) : (
          children
        )}
        {ready && (
          <div className="mt-3 text-xs leading-5 text-white/65">
            <strong>{t("Assumptions: ")}</strong>{typeof assumptions === "string" ? t(assumptions) : assumptions}
          </div>
        )}
      </section>
      <div className="text-right">
        <button
          type="button"
          aria-label={t("Reset {name}").replace("{name}", t(name))}
          disabled={resetDisabled}
          onClick={onReset}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          {t("Reset calculator")}
        </button>
      </div>
    </div>
  );
}

function translateValidationError(
  error: string,
  t: (key: string) => string
): string {
  const templates = [
    [/^(.*): enter a valid finite number\.$/, "{label}: enter a valid finite number."],
    [/^(.*) must be greater than zero\.$/, "{label} must be greater than zero."],
    [/^(.*) must be at least (.+)\.$/, "{label} must be at least {value}."],
    [/^(.*) must be no more than (.+)\.$/, "{label} must be no more than {value}."],
  ] as const;

  for (const [pattern, template] of templates) {
    const match = error.match(pattern);
    if (match) {
      return t(template)
        .replace("{label}", translateCalculatorLabel(match[1], t))
        .replace("{value}", match[2]);
    }
  }
  return t(error);
}

function translateCalculatorLabel(label: string, t: (key: string) => string) {
  const match = /^(source|target|Source|Target) (.+)$/.exec(label);
  if (match && Object.values(WATER_ION_LABELS).includes(match[2])) {
    const template = match[1] === "source" ? "source {ion}"
      : match[1] === "target" ? "target {ion}"
        : match[1] === "Source" ? "Source {ion}" : "Target {ion}";
    return t(template).replace("{ion}", t(match[2]));
  }
  return t(label);
}
