"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function SearchBar({ onSearch }: { onSearch: (v: string) => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  return (
    <input
      type="text"
      placeholder={t("Search users...")}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onSearch(e.target.value);
      }}
      className="w-full max-w-xl mx-auto mb-6 px-4 py-3 rounded-lg bg-black/40 border border-white/20 text-white"
    />
  );
}
