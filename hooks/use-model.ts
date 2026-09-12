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
    if (persistToLocalStorage && typeof window !== "undefined") {
      localStorage.setItem(storageKey, modelId);
    }
  }, [modelId, persistToLocalStorage, storageKey]);

  const setModelById = useCallback((id: string) => {
    setModelId(id);
  }, []);

  return {
    modelId,
    /** @deprecated Prefer looking up against availableModels in the selector */
    model: undefined as undefined,
    setModelId: setModelById,
  };
}
