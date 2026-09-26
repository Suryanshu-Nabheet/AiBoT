/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { useState, useCallback, useEffect } from "react";

import { DEFAULT_AGENT_MODEL } from "@/lib/chat/agent-models";

interface UseModelOptions {
  initialModel?: string;
  storageKey?: string;
  persistToLocalStorage?: boolean;
}

export function useModel({
  initialModel = DEFAULT_AGENT_MODEL,
  storageKey = "preferredModel",
  persistToLocalStorage = true,
}: UseModelOptions = {}) {
  const [modelId, setModelId] = useState<string>(initialModel);

  useEffect(() => {
    if (persistToLocalStorage && typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored.trim().length > 0) {
        setModelId(stored);
      }
    }
  }, [persistToLocalStorage, storageKey]);

  useEffect(() => {
    if (!persistToLocalStorage || typeof window === "undefined") return;

    const syncModel = (event: Event) => {
      const nextModel =
        event instanceof StorageEvent
          ? event.key === storageKey
            ? event.newValue
            : null
          : (event as CustomEvent<{ key: string; value: string }>).detail
              ?.key === storageKey
            ? (event as CustomEvent<{ key: string; value: string }>).detail
                .value
            : null;

      if (nextModel) setModelId(nextModel);
    };

    window.addEventListener("storage", syncModel);
    window.addEventListener("aibot:model-change", syncModel);
    return () => {
      window.removeEventListener("storage", syncModel);
      window.removeEventListener("aibot:model-change", syncModel);
    };
  }, [persistToLocalStorage, storageKey]);

  useEffect(() => {
    if (persistToLocalStorage && typeof window !== "undefined") {
      localStorage.setItem(storageKey, modelId);
    }
  }, [modelId, persistToLocalStorage, storageKey]);

  const setModelById = useCallback((id: string) => {
    setModelId(id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("aibot:model-change", {
          detail: { key: storageKey, value: id },
        }),
      );
    }
  }, [storageKey]);

  return {
    modelId,
    /** @deprecated Prefer looking up against availableModels in the selector */
    model: undefined as undefined,
    setModelId: setModelById,
  };
}
