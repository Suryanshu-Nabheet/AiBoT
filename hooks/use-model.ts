import { useState, useCallback, useEffect } from "react";
import { MODELS } from "@/lib/types";

const DEFAULT_MODEL_ID = MODELS[0].id;

interface UseModelOptions {
  initialModel?: string;
  storageKey?: string;
  persistToLocalStorage?: boolean;
}

export function useModel({
  initialModel = DEFAULT_MODEL_ID,
  storageKey = "preferredModel",
  persistToLocalStorage = true,
}: UseModelOptions = {}) {
  const [modelId, setModelId] = useState<string>(initialModel);

  useEffect(() => {
    if (persistToLocalStorage && typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setModelId(stored);
      }
    }
  }, [persistToLocalStorage, storageKey]);

  const [model, setModel] = useState(() =>
    MODELS.find((m) => m.id === modelId)
  );

  useEffect(() => {
    setModel(MODELS.find((m) => m.id === modelId));

    if (persistToLocalStorage && typeof window !== "undefined") {
      localStorage.setItem(storageKey, modelId);
    }
  }, [modelId, persistToLocalStorage, storageKey]);

  const setModelById = useCallback((id: string) => {
    setModelId(id);
  }, []);

  return {
    modelId,
    model,
    setModelId: setModelById,
  };
}
