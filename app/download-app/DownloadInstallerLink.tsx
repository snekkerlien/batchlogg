"use client";

import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function DownloadInstallerLink({
  href,
  label,
  version,
  className,
  children,
}: {
  href: string;
  label: string;
  version: string;
  className: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <a
      href={href}
      aria-label={`${t(label)}, ${version}`}
      className={className}
    >
      {children}
      <span className="text-xs font-medium text-white/65">{version}</span>
    </a>
  );
}
