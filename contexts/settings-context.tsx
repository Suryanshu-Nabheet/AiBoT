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
  openai: "/icons/chatgpt.svg",
  anthropic: "/icons/anthropic.svg",
  google: "/icons/google.svg",
  deepseek: "/icons/deepseek.svg",
  openrouter: "/icons/openrouter.svg",
};

interface SettingsContextType {
  apiKeys: ApiKeys;
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  availableModels: ModelFull[];
  enabledModels: string[];
  toggleModel: (modelId: string) => void;
  verifyKey: (provider: keyof ApiKeys, key: string) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
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

    return [...platformModels, ...providerModels];
  }, [apiKeys]);

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKeys = localStorage.getItem("aibot_api_keys");
      if (storedKeys) setApiKeys(JSON.parse(storedKeys));

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
      localStorage.setItem("aibot_enabled_models", JSON.stringify(enabledModels));
    }
  }, [apiKeys, enabledModels, hasLoaded]);

  const setApiKey = (provider: keyof ApiKeys, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
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
      verifyKey
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
