/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MODELS, ModelFull } from "@/lib/types";
import { PROVIDER_MODELS } from "@/lib/provider-models";

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  deepseek?: string;
  openrouter?: string;
}

const PROVIDER_ICONS: Record<string, string> = {
  openai: "/icons/openai.svg",
  anthropic: "/icons/anthropic.svg",
  google: "/icons/google.svg",
  deepseek: "/icons/deepseek.svg",
  openrouter: "/icons/openrouter.svg",
  ollama: "/icons/ollama.svg",
};

interface SettingsContextType {
  apiKeys: ApiKeys;
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  availableModels: ModelFull[];
  enabledModels: string[];
  toggleModel: (modelId: string) => void;
  verifyKey: (provider: keyof ApiKeys, key: string) => Promise<boolean>;
  ollamaUrl: string;
  setOllamaUrl: (url: string) => void;
  ollamaModels: any[];
  setOllamaModels: (models: any[]) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [ollamaUrl, setOllamaUrlState] = useState<string>("http://localhost:11434");
  const [ollamaModels, setOllamaModelsState] = useState<any[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Compute available models based on keys
  const availableModels = React.useMemo(() => {
    const platformModels = MODELS.map(m => ({ ...m, provider: "platform" }));
    
    const providerModels = Object.entries(apiKeys).flatMap(([providerId, key]) => {
      if (!key) return [];
      const models = PROVIDER_MODELS[providerId] || [];
      return models.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        isPremium: true,
        summary: m.summary,
        logo: PROVIDER_ICONS[m.provider]
      }));
    });

    const localOllamaModels = ollamaModels.map(m => ({
      id: `ollama/${m.name}`,
      name: m.name,
      provider: "ollama",
      isPremium: false,
      summary: `Local Ollama model (${m.details?.parameter_size || "Unknown size"})`,
      logo: "/icons/ollama.svg"
    }));

    return [...platformModels, ...providerModels, ...localOllamaModels];
  }, [apiKeys, ollamaModels]);

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKeys = localStorage.getItem("aibot_api_keys");
      if (storedKeys) setApiKeys(JSON.parse(storedKeys));

      const storedUrl = localStorage.getItem("aibot_ollama_url");
      if (storedUrl) setOllamaUrlState(storedUrl);

      const storedOllamaModels = localStorage.getItem("aibot_ollama_models");
      if (storedOllamaModels) setOllamaModelsState(JSON.parse(storedOllamaModels));

      const storedModels = localStorage.getItem("aibot_enabled_models");
      if (storedModels) {
        setEnabledModels(JSON.parse(storedModels));
      } else {
        // Default: Enable all platform models
        setEnabledModels(MODELS.map(m => m.id));
      }
      setHasLoaded(true);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (hasLoaded && typeof window !== "undefined") {
      localStorage.setItem("aibot_api_keys", JSON.stringify(apiKeys));
      localStorage.setItem("aibot_ollama_url", ollamaUrl);
      localStorage.setItem("aibot_ollama_models", JSON.stringify(ollamaModels));
      localStorage.setItem("aibot_enabled_models", JSON.stringify(enabledModels));
    }
  }, [apiKeys, ollamaUrl, ollamaModels, enabledModels, hasLoaded]);

  const setApiKey = (provider: keyof ApiKeys, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  };

  const setOllamaUrl = (url: string) => {
    setOllamaUrlState(url);
  };

  const setOllamaModels = (models: any[]) => {
    setOllamaModelsState(models);
    // Auto-enable any detected Ollama models so the user can use them immediately
    setEnabledModels(prev => {
      const newIds = models.map(m => `ollama/${m.name}`);
      const filteredPrev = prev.filter(id => !id.startsWith("ollama/"));
      return [...filteredPrev, ...newIds];
    });
  };

  const toggleModel = (modelId: string) => {
    setEnabledModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId) 
        : [...prev, modelId]
    );
  };

  const verifyKey = async (provider: keyof ApiKeys, key: string): Promise<boolean> => {
    if (!key || key.length < 10) return false;
    await new Promise(resolve => setTimeout(resolve, 800));
    return true; 
  };

  return (
    <SettingsContext.Provider value={{
      apiKeys,
      setApiKey,
      availableModels,
      enabledModels,
      toggleModel,
      verifyKey,
      ollamaUrl,
      setOllamaUrl,
      ollamaModels,
      setOllamaModels
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
