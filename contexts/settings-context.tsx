/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { MODELS, ModelFull } from "@/lib/types";
import { getModelsForProvider } from "@/lib/provider-models";
import {
  applyDocumentLocale,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
} from "@/lib/i18n";

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  deepseek?: string;
  openrouter?: string;
}

export type OllamaConnectionStatus = "unknown" | "connected" | "disconnected";

export type OllamaDiscoveredModel = {
  name: string;
  size?: number;
  details?: { parameter_size?: string };
};

export interface GeneralPreferences {
  locale: Locale;
  desktopNotifications: boolean;
  completionSound: boolean;
}

const PROVIDER_ICONS: Record<string, string> = {
  openai: "/icons/openai.svg",
  anthropic: "/icons/anthropic.svg",
  google: "/icons/google.svg",
  deepseek: "/icons/deepseek.svg",
  openrouter: "/icons/openrouter.svg",
  ollama: "/icons/ollama.svg",
};

const ENABLED_MODELS_KEY = "aibot_enabled_models";
const PLATFORM_MODEL_CATALOG_KEY = "aibot_platform_model_catalog";

/** Keep newly added `MODELS` entries visible when enabled list was saved earlier. */
function loadEnabledModelsFromStorage(): string[] {
  const platformIds = MODELS.map((m) => m.id);

  let stored: string[] = [];
  try {
    const raw = localStorage.getItem(ENABLED_MODELS_KEY);
    if (raw) stored = JSON.parse(raw) as string[];
  } catch {
    stored = [];
  }

  let catalog: string[] = [];
  try {
    const raw = localStorage.getItem(PLATFORM_MODEL_CATALOG_KEY);
    if (raw) catalog = JSON.parse(raw) as string[];
  } catch {
    catalog = [];
  }

  if (!stored.length) {
    localStorage.setItem(
      PLATFORM_MODEL_CATALOG_KEY,
      JSON.stringify(platformIds),
    );
    return platformIds;
  }

  let enabled = stored;

  if (catalog.length === 0) {
    const legacyMissing = platformIds.filter((id) => !enabled.includes(id));
    enabled = legacyMissing.length ? [...enabled, ...legacyMissing] : enabled;
    localStorage.setItem(
      PLATFORM_MODEL_CATALOG_KEY,
      JSON.stringify(platformIds),
    );
    return enabled;
  }

  const brandNew = platformIds.filter((id) => !catalog.includes(id));
  localStorage.setItem(PLATFORM_MODEL_CATALOG_KEY, JSON.stringify(platformIds));

  if (brandNew.length === 0) return enabled;

  const toEnable = brandNew.filter((id) => !enabled.includes(id));
  return toEnable.length ? [...enabled, ...toEnable] : enabled;
}

interface SettingsContextType {
  apiKeys: ApiKeys;
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  availableModels: ModelFull[];
  enabledModels: string[];
  toggleModel: (modelId: string) => void;
  verifyKey: (provider: keyof ApiKeys, key: string) => Promise<boolean>;
  ollamaUrl: string;
  setOllamaUrl: (url: string) => void;
  ollamaModels: OllamaDiscoveredModel[];
  setOllamaModels: (models: OllamaDiscoveredModel[]) => void;
  ollamaStatus: OllamaConnectionStatus;
  setOllamaStatus: (status: OllamaConnectionStatus) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  desktopNotifications: boolean;
  setDesktopNotifications: (enabled: boolean) => Promise<boolean>;
  completionSound: boolean;
  setCompletionSound: (enabled: boolean) => void;
  hasLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [ollamaUrl, setOllamaUrlState] = useState<string>(
    "http://localhost:11434",
  );
  const [ollamaModels, setOllamaModelsState] = useState<
    OllamaDiscoveredModel[]
  >([]);
  const [ollamaStatus, setOllamaStatus] =
    useState<OllamaConnectionStatus>("unknown");
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [desktopNotifications, setDesktopNotificationsState] = useState(false);
  const [completionSound, setCompletionSoundState] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const availableModels = React.useMemo(() => {
    const platformModels = MODELS.map((m) => ({ ...m, provider: "platform" }));

    const providerModels = Object.entries(apiKeys).flatMap(
      ([providerId, key]) => {
        if (!key) return [];
        const models = getModelsForProvider(providerId);
        return models.map((m) => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          isPremium: true,
          summary: m.summary,
          logo: PROVIDER_ICONS[m.provider],
        }));
      },
    );

    const localOllamaModels = ollamaModels.map((m) => ({
      id: `ollama/${m.name}`,
      name: m.name,
      provider: "ollama",
      isPremium: false,
      summary: `Local Ollama model (${m.details?.parameter_size || "Unknown size"})`,
      logo: "/icons/ollama.svg",
    }));

    return [...platformModels, ...providerModels, ...localOllamaModels];
  }, [apiKeys, ollamaModels]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedKeys = localStorage.getItem("aibot_api_keys");
      if (storedKeys) setApiKeys(JSON.parse(storedKeys));

      const storedUrl = localStorage.getItem("aibot_ollama_url");
      if (storedUrl) setOllamaUrlState(storedUrl);

      const storedOllamaModels = localStorage.getItem("aibot_ollama_models");
      if (storedOllamaModels)
        setOllamaModelsState(JSON.parse(storedOllamaModels));

      const storedStatus = localStorage.getItem("aibot_ollama_status");
      if (storedStatus === "connected" || storedStatus === "disconnected") {
        setOllamaStatus(storedStatus);
      } else {
        setOllamaStatus("unknown");
      }

      setEnabledModels(loadEnabledModelsFromStorage());

      const storedGeneral = localStorage.getItem("aibot_general");
      if (storedGeneral) {
        const parsed = JSON.parse(storedGeneral) as Partial<GeneralPreferences>;
        if (isLocale(parsed.locale)) setLocaleState(parsed.locale);
        if (typeof parsed.desktopNotifications === "boolean") {
          setDesktopNotificationsState(parsed.desktopNotifications);
        }
        if (typeof parsed.completionSound === "boolean") {
          setCompletionSoundState(parsed.completionSound);
        }
      }
    } catch (e) {
      console.error("Failed to load settings from localStorage", e);
    }

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded || typeof window === "undefined") return;

    localStorage.setItem("aibot_api_keys", JSON.stringify(apiKeys));
    localStorage.setItem("aibot_ollama_url", ollamaUrl);
    localStorage.setItem("aibot_ollama_models", JSON.stringify(ollamaModels));
    localStorage.setItem("aibot_ollama_status", ollamaStatus);
    localStorage.setItem(ENABLED_MODELS_KEY, JSON.stringify(enabledModels));
    localStorage.setItem(
      "aibot_general",
      JSON.stringify({
        locale,
        desktopNotifications,
        completionSound,
      } satisfies GeneralPreferences),
    );
  }, [
    apiKeys,
    ollamaUrl,
    ollamaModels,
    ollamaStatus,
    enabledModels,
    locale,
    desktopNotifications,
    completionSound,
    hasLoaded,
  ]);

  useEffect(() => {
    if (!hasLoaded) return;
    applyDocumentLocale(locale);
  }, [locale, hasLoaded]);

  const setApiKey = (provider: keyof ApiKeys, key: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: key }));
  };

  const setOllamaUrl = (url: string) => {
    setOllamaUrlState(url);
  };

  const setOllamaModels = (models: OllamaDiscoveredModel[]) => {
    setOllamaModelsState(models);
    setEnabledModels((prev) => {
      const newIds = models.map((m) => `ollama/${m.name}`);
      const filteredPrev = prev.filter((id) => !id.startsWith("ollama/"));
      return [...filteredPrev, ...newIds];
    });
  };

  const toggleModel = (modelId: string) => {
    setEnabledModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId],
    );
  };

  const setLocale = (next: Locale) => {
    setLocaleState(next);
  };

  const setDesktopNotifications = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!enabled) {
        setDesktopNotificationsState(false);
        return true;
      }

      const { ensureNotificationPermission } =
        await import("@/lib/desktop-notifications");
      const permission = await ensureNotificationPermission();
      if (permission !== "granted") {
        setDesktopNotificationsState(false);
        return false;
      }

      setDesktopNotificationsState(true);
      return true;
    },
    [],
  );

  const setCompletionSound = (enabled: boolean) => {
    setCompletionSoundState(enabled);
  };

  const verifyKey = async (
    provider: keyof ApiKeys,
    key: string,
  ): Promise<boolean> => {
    if (!key || key.trim().length < 8) return false;

    try {
      const res = await fetch("/api/keys/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: key.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean };
      return !!data.ok;
    } catch {
      return false;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        apiKeys,
        setApiKey,
        availableModels,
        enabledModels,
        toggleModel,
        verifyKey,
        ollamaUrl,
        setOllamaUrl,
        ollamaModels,
        setOllamaModels,
        ollamaStatus,
        setOllamaStatus,
        locale,
        setLocale,
        desktopNotifications,
        setDesktopNotifications,
        completionSound,
        setCompletionSound,
        hasLoaded,
      }}
    >
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
