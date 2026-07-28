/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

export type Locale = "en" | "hi" | "ja";

export const LOCALES: {
  id: Locale;
  label: string;
  nativeLabel: string;
  htmlLang: string;
  /** English name of the language — used in AI system prompts */
  languageName: string;
}[] = [
  { id: "en", label: "English (US)", nativeLabel: "English (US)", htmlLang: "en", languageName: "English" },
  { id: "hi", label: "Hindi (India)", nativeLabel: "हिन्दी (भारत)", htmlLang: "hi", languageName: "Hindi" },
  { id: "ja", label: "Japanese", nativeLabel: "日本語", htmlLang: "ja", languageName: "Japanese" },
];

export const DEFAULT_LOCALE: Locale = "en";

export function getLanguageName(locale: Locale): string {
  return LOCALES.find((l) => l.id === locale)?.languageName ?? "English";
}
