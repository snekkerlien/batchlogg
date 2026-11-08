"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function TranslatedText({ text }: { text: string }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  return isAdminPath ? text : t(text);
}
