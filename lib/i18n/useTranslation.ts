"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/app/components/LanguageProvider";
import { getMessage, type MessageKey } from "./messages";
import { getPageLanguage } from "./language";

export function useTranslation() {
  const { language: preferredLanguage } = useLanguage();
  const pathname = usePathname();
  const language = getPageLanguage(preferredLanguage, pathname);
  const t = useCallback(
    (key: MessageKey) => getMessage(language, key),
    [language]
  );
  return { t, language };
}
