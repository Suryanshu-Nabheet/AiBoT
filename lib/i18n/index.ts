/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { en, type EnDictionary, type TranslationKey } from "./dictionaries/en";
import { hi } from "./dictionaries/hi";
import { ja } from "./dictionaries/ja";
import { DEFAULT_LOCALE, LOCALES, getLanguageName, type Locale } from "./types";

export type { Locale, EnDictionary, TranslationKey };
export { DEFAULT_LOCALE, LOCALES, getLanguageName };

const DICTIONARIES: Record<Locale, EnDictionary> = { en, hi, ja };

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "hi" || value === "ja";
}

export function getDictionary(locale: Locale): EnDictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const template = getDictionary(locale)[key] ?? getDictionary(DEFAULT_LOCALE)[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
    template
  );
}

export function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  const meta = LOCALES.find((l) => l.id === locale);
  document.documentElement.lang = meta?.htmlLang ?? "en";
}

/** Appended to system prompts so the model replies in the user's display language. */
export function localeReplyDirective(locale: Locale): string {
  const language = getLanguageName(locale);
  return (
    `\n\n## RESPONSE LANGUAGE\n` +
    `- Always write your final user-visible answer in ${language}.\n` +
    `- Keep code identifiers, file paths, and technical API names in their original form.\n` +
    `- Structural tags such as <thinking>...</thinking> stay as instructed; only the content and final answer use ${language}.`
  );
}

