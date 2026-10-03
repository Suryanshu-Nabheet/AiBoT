"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_KEY = "aibot_web_search_enabled";

export function useWebSearchMode(storageKey = DEFAULT_KEY) {
  const [webSearchEnabled, setWebSearchEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(storageKey);
    setWebSearchEnabledState(stored === "true");
    setHydrated(true);
  }, [storageKey]);

  const setWebSearchEnabled = useCallback(
    (enabled: boolean) => {
      setWebSearchEnabledState(enabled);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, String(enabled));
      }
    },
    [storageKey],
  );

  const toggleWebSearch = useCallback(() => {
    setWebSearchEnabledState((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, String(next));
      }
      return next;
    });
  }, [storageKey]);

  return {
    webSearchEnabled,
    setWebSearchEnabled,
    toggleWebSearch,
    hydrated,
  };
}
