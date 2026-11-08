"use client";

import { useRef } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type UploadProps = {
  onUpload: (file: File) => void;
};

export default function UploadComponent({ onUpload }: UploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  function trigger() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  }

  return (
    <>
      <button
        type="button"
        onClick={trigger}
        className="flex items-center justify-center w-[150px] h-[48px] bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white text-center"
      >
        {t("Upload image")}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </>
  );
}
