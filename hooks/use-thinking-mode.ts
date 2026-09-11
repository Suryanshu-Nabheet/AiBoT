/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_KEY = "aibot_thinking_enabled";

export function useThinkingMode(storageKey = DEFAULT_KEY) {
  const [thinkingEnabled, setThinkingEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(storageKey);
    setThinkingEnabledState(stored === "true");
    setHydrated(true);
  }, [storageKey]);

  const setThinkingEnabled = useCallback(
    (enabled: boolean) => {
      setThinkingEnabledState(enabled);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, String(enabled));
      }
    },
    [storageKey],
  );

  const toggleThinking = useCallback(() => {
    setThinkingEnabledState((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, String(next));
      }
      return next;
    });
  }, [storageKey]);

  return {
    thinkingEnabled,
    setThinkingEnabled,
    toggleThinking,
    hydrated,
  };
}
