"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

type HelpButtonProps = {
  onOpen: () => void;
};

export default function HelpButton({ onOpen }: HelpButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onOpen}
      className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
    >
      {t("Help")}
    </button>
  );
}
