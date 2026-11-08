"use client";

import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import CalculatorDisclosureArrow from "./CalculatorDisclosureArrow";

export default function CalculatorDisclosure({
  id,
  title,
  description,
  defaultOpen = false,
  className = "",
  children,
}: {
  id: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <details
      id={id}
      open={defaultOpen ? true : undefined}
      className={`scroll-mt-24 rounded-xl border border-white/10 bg-white/5 p-5 sm:p-6 ${className}`}
    >
      <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 text-green-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300">
        <span className="text-lg font-semibold leading-6">{t(title)}</span>
        <CalculatorDisclosureArrow />
      </summary>
      <div className="mt-4">
        <p className="mb-5 text-sm leading-6 text-center text-white/70">
          {t(description)}
        </p>
        {children}
      </div>
    </details>
  );
}
