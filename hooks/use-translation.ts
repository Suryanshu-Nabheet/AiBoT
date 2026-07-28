/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useCallback } from "react";
import { useSettings } from "@/contexts/settings-context";
import { translate, type TranslationKey } from "@/lib/i18n";

export function useTranslation() {
  const { locale } = useSettings();

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale]
  );

  return { t, locale };
}
