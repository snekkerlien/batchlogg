"use client";

import {
  SITE_LANGUAGES,
  type SiteLanguage,
} from "@/lib/i18n/language";
import { getMessage } from "@/lib/i18n/messages";

export default function LanguagePreferenceSelect({
  value,
  onChange,
  id,
  disabled = false,
}: {
  value: SiteLanguage;
  onChange: (language: SiteLanguage) => void;
  id: string;
  disabled?: boolean;
}) {
  return (
    <fieldset id={id} className="text-sm">
      <div
        role="group"
        aria-label={getMessage(value, "language.label")}
        className="flex flex-wrap justify-center gap-3"
      >
        {SITE_LANGUAGES.map((language) => {
          const label = getMessage(value, language.labelKey);
          const comingSoon = getMessage(value, "language.comingSoon");
          const Flag = flags[language.flag];
          return (
            <button
              key={language.code}
              type="button"
              aria-pressed={value === language.code}
              aria-label={language.available ? label : `${label} (${comingSoon})`}
              title={language.available ? label : `${label} (${comingSoon})`}
              disabled={disabled || !language.available}
              onClick={() => onChange(language.code)}
              className={`flex h-11 w-14 items-center justify-center rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                !language.available
                  ? "border-white/10 bg-black/20 text-white/45"
                  : value === language.code
                    ? "border-green-400 bg-green-500/15 text-white"
                    : "border-white/20 bg-black/30 text-white/75 hover:bg-white/10"
              }`}
            >
              <Flag />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function EnglishFlag() {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 36" className="h-6 w-10 shrink-0 rounded-sm">
      <rect width="60" height="36" fill="#234476" />
      <path d="M0 0 60 36M60 0 0 36" stroke="#fff" strokeWidth="8" />
      <path d="M0 0 60 36M60 0 0 36" stroke="#c8102e" strokeWidth="3" />
      <path d="M30 0v36M0 18h60" stroke="#fff" strokeWidth="12" />
      <path d="M30 0v36M0 18h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}

function NorwegianFlag() {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 36" className="h-6 w-10 shrink-0 rounded-sm">
      <rect width="60" height="36" fill="#ba0c2f" />
      <path d="M18 0v36M0 18h60" stroke="#fff" strokeWidth="10" />
      <path d="M18 0v36M0 18h60" stroke="#00205b" strokeWidth="4" />
    </svg>
  );
}

const flags = { gb: EnglishFlag, no: NorwegianFlag };
