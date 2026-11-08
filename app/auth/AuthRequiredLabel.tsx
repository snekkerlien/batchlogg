"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AuthRequiredLabel({ text }: { text: string }) {
  const { t } = useTranslation();

  return (
    <>
      {t(text)}
      <span aria-hidden="true"> *</span>
      <span className="sr-only"> ({t("required")})</span>
    </>
  );
}
