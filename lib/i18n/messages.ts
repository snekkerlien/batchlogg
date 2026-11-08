import type { SiteLanguage } from "./language";
import english from "./locales/en.json";
import norwegianBokmal from "./locales/nb.json";

export type MessageKey = string;

export const messages: Record<SiteLanguage, Record<MessageKey, string>> = {
  en: english,
  nb: norwegianBokmal,
};

export function getMessage(language: SiteLanguage, key: MessageKey) {
  const message = messages[language][key];
  if (message === undefined) {
    if (language === "en") return key;
    throw new Error(`Missing ${language} translation for "${key}"`);
  }
  return message;
}
