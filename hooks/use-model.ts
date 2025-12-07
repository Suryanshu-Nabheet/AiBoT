import { useState, useCallback, useEffect } from "react";
export const FREE_MODELS = [
  // GPT Models
  {
    id: "openai/gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    description: "Fast and efficient, good for most tasks",
  },

  // Gemini Models (Working ones)
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash (Free)",
    provider: "Google",
    description: "Latest Gemini with 1M context, very fast",
  },
  {
    id: "google/gemini-flash-1.5",
    name: "Gemini Flash 1.5",
    provider: "Google",
    description: "Fast and efficient Gemini model",
  },

  // Claude Models
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    description: "Fast, affordable Claude model",
  },

  // Llama Models
  {
    id: "meta-llama/llama-3.1-8b-instruct:free",
    name: "Llama 3.1 8B (Free)",
    provider: "Meta",
    description: "Open-source, fast responses",
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B (Free)",
    provider: "Meta",
    description: "Lightweight and efficient",
  },

  // Mistral Models
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B (Free)",
    provider: "Mistral",
    description: "Powerful open-source model",
  },

  // Microsoft Models
  {
    id: "microsoft/phi-3-mini-128k-instruct:free",
    name: "Phi-3 Mini (Free)",
    provider: "Microsoft",
    description: "Small but capable, 128K context",
  },

  // Qwen Models
  {
    id: "qwen/qwen-2-7b-instruct:free",
    name: "Qwen 2 7B (Free)",
    provider: "Qwen",
    description: "Efficient Chinese-English bilingual model",
  },
];

const DEFAULT_MODEL_ID = FREE_MODELS[0].id;

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
    FREE_MODELS.find((m) => m.id === modelId)
  );

  useEffect(() => {
    setModel(FREE_MODELS.find((m) => m.id === modelId));

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
