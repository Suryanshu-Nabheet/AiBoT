/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  User,
  Cpu,
  Key,
  Info,
  X,
  Bell,
  Globe,
  ShieldCheck,
  ArrowSquareOut,
  HardDrives,
  WarningCircle,
  Copy,
  MoonStars,
  SpeakerHigh,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useViewMode } from "@/contexts/view-mode-context";
import { useSettings, ApiKeys } from "@/contexts/settings-context";
import { MODELS } from "@/lib/types";
import { getModelsForProvider } from "@/lib/provider-models";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { LOCALES, type Locale } from "@/lib/i18n";
import { getNotificationPermission } from "@/lib/desktop-notifications";
import packageJson from "@/package.json";
import { BrandIcon } from "@/components/ui/brand-icon";
import { normalizeOllamaUrl, probeOllamaTags } from "@/lib/chat/ollama-url";

type SettingsSection =
  | "general"
  | "models"
  | "api-keys"
  | "local-llm"
  | "about";

interface SectionItem {
  id: SettingsSection;
  labelKey:
    | "settings.section.general"
    | "settings.section.models"
    | "settings.section.apiKeys"
    | "settings.section.localLlm"
    | "settings.section.about";
  icon: React.ElementType;
}

const SECTIONS: SectionItem[] = [
  { id: "general", labelKey: "settings.section.general", icon: User },
  { id: "models", labelKey: "settings.section.models", icon: Cpu },
  { id: "api-keys", labelKey: "settings.section.apiKeys", icon: Key },
  { id: "local-llm", labelKey: "settings.section.localLlm", icon: HardDrives },
  { id: "about", labelKey: "settings.section.about", icon: Info },
];

const APP_VERSION = packageJson.version || "0.1.0";

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    placeholder: "sk-proj-...",
    icon: "/icons/openai.svg",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    placeholder: "sk-ant-...",
    icon: "/icons/anthropic.svg",
  },
  {
    id: "google",
    name: "Google Gemini",
    placeholder: "AIzaSy...",
    icon: "/icons/google.svg",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    placeholder: "sk-...",
    icon: "/icons/deepseek.svg",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    placeholder: "sk-or-...",
    icon: "/icons/openrouter.svg",
  },
];

export function SettingsPanel() {
  const { setViewMode } = useViewMode();
  const { t } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const {
    apiKeys,
    setApiKey,
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
  } = useSettings();

  const [activeSection, setActiveSection] =
    useState<SettingsSection>("general");
  const [verifyingProvider, setVerifyingProvider] = useState<string | null>(
    null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const [ollamaScanDetail, setOllamaScanDetail] = useState<string | null>(null);
  const [selectedOS, setSelectedOS] = useState<"macos" | "windows" | "linux">(
    "macos",
  );
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const themeValue = useMemo(() => {
    if (!themeReady) return "system";
    return theme || "system";
  }, [theme, themeReady]);

  // Automatically detect user OS on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes("win")) setSelectedOS("windows");
      else if (ua.includes("linux")) setSelectedOS("linux");
      else setSelectedOS("macos");
    }
  }, []);

  const siteOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const ollamaOriginsValue = siteOrigin ? `${siteOrigin},*` : "*";

  const macOllamaEnvFileCommand = `mkdir -p ~/.ollama && printf '%s\\n' 'OLLAMA_ORIGINS="${ollamaOriginsValue}"' > ~/.ollama/env`;

  const runOllamaScan = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      setIsScanning(true);
      if (!silent) setShowTroubleshooter(false);
      setOllamaScanDetail(null);

      const result = await probeOllamaTags(ollamaUrl);
      if (result.ok) {
        setOllamaModels(result.models as typeof ollamaModels);
        const usedLoopback =
          result.resolvedBase !== normalizeOllamaUrl(ollamaUrl);
        if (usedLoopback) setOllamaUrl(result.resolvedBase);
        setOllamaStatus("connected");
        setShowTroubleshooter(false);
        if (!silent) {
          if (usedLoopback) {
            toast.success(t("localLlm.scan.loopback"));
          } else if (result.models.length > 0) {
            toast.success(
              t("localLlm.scan.success", { count: result.models.length }),
            );
          } else {
            toast.warning(t("localLlm.scan.empty"));
          }
        }
      } else {
        console.warn("Ollama scan failed:", result.error);
        setOllamaStatus("disconnected");
        setOllamaScanDetail(result.error);
        setShowTroubleshooter(true);
        if (!silent) toast.error(t("localLlm.scan.fail"));
      }
      setIsScanning(false);
    },
    [ollamaUrl, setOllamaModels, setOllamaStatus, setOllamaUrl, t],
  );

  const handleAutoDetect = () => runOllamaScan();

  const didProbeLocalLlmRef = useRef(false);
  useEffect(() => {
    if (
      !hasLoaded ||
      activeSection !== "local-llm" ||
      didProbeLocalLlmRef.current
    ) {
      return;
    }
    didProbeLocalLlmRef.current = true;
    void runOllamaScan({ silent: true });
  }, [activeSection, hasLoaded, runOllamaScan]);

  const handleVerifyKey = async (provider: keyof ApiKeys, key: string) => {
    if (!key) return;
    setVerifyingProvider(provider);
    const isValid = await verifyKey(provider, key);
    setVerifyingProvider(null);
    if (isValid) {
      toast.success(
        t("apiKeys.verified", { provider: provider.toUpperCase() }),
      );
    } else {
      toast.error(t("apiKeys.invalid", { provider: provider.toUpperCase() }));
    }
  };

  const handleNotificationsToggle = async (checked: boolean) => {
    if (!checked) {
      await setDesktopNotifications(false);
      toast.message(t("general.notifications.disabled"));
      return;
    }

    const permission = getNotificationPermission();
    if (permission === "unsupported") {
      toast.error(t("general.notifications.unsupported"));
      return;
    }

    const ok = await setDesktopNotifications(true);
    if (ok) {
      toast.success(t("general.notifications.enabled"));
    } else {
      toast.error(t("general.notifications.denied"));
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header>
              <h3 className="text-xl font-bold tracking-tight mb-1 text-foreground">
                {t("general.title")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("general.subtitle")}
              </p>
            </header>

            <div className="space-y-4">
              <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-border/40 bg-muted/20 p-5 transition-colors sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner shrink-0">
                    <Globe className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {t("general.language.title")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("general.language.desc")}
                    </p>
                  </div>
                </div>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                  className="w-full shrink-0 cursor-pointer rounded-xl border border-border/50 bg-background/50 p-2 px-4 text-xs font-bold transition-all focus:outline-none focus:ring-1 focus:ring-primary/40 sm:w-auto"
                  aria-label={t("general.language.title")}
                >
                  {LOCALES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nativeLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-border/40 bg-muted/20 p-5 transition-colors sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner shrink-0">
                    <MoonStars className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {t("general.theme.title")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("general.theme.desc")}
                    </p>
                  </div>
                </div>
                <select
                  value={themeValue}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full shrink-0 cursor-pointer rounded-xl border border-border/50 bg-background/50 p-2 px-4 text-xs font-bold transition-all focus:outline-none focus:ring-1 focus:ring-primary/40 sm:w-auto"
                  aria-label={t("general.theme.title")}
                >
                  <option value="system">
                    {t("general.theme.system")}
                    {themeReady && resolvedTheme ? ` (${resolvedTheme})` : ""}
                  </option>
                  <option value="light">{t("general.theme.light")}</option>
                  <option value="dark">{t("general.theme.dark")}</option>
                </select>
              </div>

              <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-border/40 bg-muted/20 p-5 transition-colors sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner shrink-0">
                    <Bell className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {t("general.notifications.title")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("general.notifications.desc")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={desktopNotifications}
                  onCheckedChange={handleNotificationsToggle}
                  aria-label={t("general.notifications.title")}
                  className="self-end sm:self-auto"
                />
              </div>

              <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-border/40 bg-muted/20 p-5 transition-colors sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner shrink-0">
                    <SpeakerHigh className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {t("general.sound.title")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("general.sound.desc")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={completionSound}
                  onCheckedChange={setCompletionSound}
                  aria-label={t("general.sound.title")}
                  className="self-end sm:self-auto"
                />
              </div>
            </div>
          </div>
        );

      case "models":
        const activeProviders = Object.keys(apiKeys).filter(
          (p) => !!apiKeys[p as keyof ApiKeys],
        );

        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight mb-1 text-foreground">
                  {t("models.title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("models.subtitle")}
                </p>
              </div>
            </header>

            <div className="space-y-12">
              {/* Platform Models */}
              <section>
                <div className="flex items-center gap-2 mb-5 ml-1">
                  <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("models.platform")}
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MODELS.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center justify-between p-4.5 rounded-2xl border transition-all duration-300",
                        enabledModels.includes(m.id)
                          ? "bg-primary/[0.02] border-primary/10 shadow-sm"
                          : "bg-muted/10 border-border/20 opacity-50 grayscale",
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-sm">
                          <BrandIcon
                            src={m.logo || "/icons/ai.svg"}
                            alt=""
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold tracking-tight truncate">
                            {m.name.replace(" (Free)", "")}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider truncate opacity-70">
                            {t("models.platformOptimized")}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={enabledModels.includes(m.id)}
                        onCheckedChange={() => toggleModel(m.id)}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Dynamic Provider Models */}
              {activeProviders.length > 0 && (
                <div className="pt-10 border-t border-border/30 mt-10">
                  <div className="flex flex-col gap-1.5 mb-10">
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.4em] text-primary">
                      {t("models.external")}
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {t("models.externalDesc")}
                    </p>
                  </div>

                  <div className="space-y-12">
                    {activeProviders.map((providerId) => {
                      const provider = PROVIDERS.find(
                        (p) => p.id === providerId,
                      );
                      const models = getModelsForProvider(providerId);

                      if (models.length === 0) return null;

                      return (
                        <section
                          key={providerId}
                          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                        >
                          <div className="flex items-center gap-2 mb-5 ml-1">
                            <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                              {provider?.name} {t("models.ecosystem")}
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {models.map((m) => (
                              <div
                                key={m.id}
                                className={cn(
                                  "flex items-center justify-between p-4.5 rounded-2xl border transition-all duration-300",
                                  enabledModels.includes(m.id)
                                    ? "bg-emerald-500/[0.02] border-emerald-500/20 shadow-sm"
                                    : "bg-muted/10 border-border/20 opacity-50 grayscale",
                                )}
                              >
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-sm">
                                    <BrandIcon
                                      src={provider?.icon || "/icons/ai.svg"}
                                      alt=""
                                      className="w-full h-full"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[14px] font-bold tracking-tight truncate">
                                      {m.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider truncate opacity-70">
                                      {m.id}
                                    </p>
                                  </div>
                                </div>
                                <Switch
                                  checked={enabledModels.includes(m.id)}
                                  onCheckedChange={() => toggleModel(m.id)}
                                />
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeProviders.length === 0 && (
                <div className="p-12 rounded-3xl border border-dashed border-border/60 bg-muted/5 flex flex-col items-center text-center space-y-4">
                  <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground shadow-inner">
                    <Key className="size-6" />
                  </div>
                  <div className="max-w-[280px] space-y-2">
                    <p className="text-[15px] font-bold">
                      {t("models.unlock.title")}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {t("models.unlock.desc")}{" "}
                      <button
                        onClick={() => setActiveSection("api-keys")}
                        className="text-primary font-bold hover:underline"
                      >
                        {t("models.unlock.link")}
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "api-keys":
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header>
              <h3 className="text-xl font-bold tracking-tight mb-1 text-foreground">
                {t("apiKeys.title")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("apiKeys.subtitle")}
              </p>
            </header>

            <div className="space-y-4">
              {PROVIDERS.map((provider) => (
                <div
                  key={provider.id}
                  className="p-5 rounded-2xl bg-muted/20 border border-border/40 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center p-2 shadow-sm">
                        <BrandIcon
                          src={provider.icon}
                          alt=""
                          className="w-full h-full"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{provider.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t("apiKeys.enterKey", { provider: provider.name })}
                        </p>
                      </div>
                    </div>
                    {apiKeys[provider.id as keyof ApiKeys] && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase tracking-wider">
                        {t("apiKeys.active")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1 group">
                      <Input
                        type="password"
                        placeholder={provider.placeholder}
                        value={apiKeys[provider.id as keyof ApiKeys] || ""}
                        onChange={(e) =>
                          setApiKey(
                            provider.id as keyof ApiKeys,
                            e.target.value,
                          )
                        }
                        className="bg-background/50 border-border/50 rounded-xl px-4 py-5 text-xs font-mono focus:ring-1 focus:ring-primary/30"
                      />
                      <Key className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-primary/50 transition-colors" />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleVerifyKey(
                          provider.id as keyof ApiKeys,
                          apiKeys[provider.id as keyof ApiKeys] || "",
                        )
                      }
                      disabled={
                        verifyingProvider === provider.id ||
                        !apiKeys[provider.id as keyof ApiKeys]
                      }
                      className="h-auto rounded-xl border-border/50 px-6 py-2.5 text-[11px] font-bold transition-all duration-300 hover:border-primary hover:bg-primary hover:text-white"
                    >
                      {verifyingProvider === provider.id
                        ? t("apiKeys.checking")
                        : t("apiKeys.verify")}
                    </Button>
                  </div>
                </div>
              ))}

              <div className="p-5 rounded-2xl bg-primary/[0.03] border border-primary/10 flex items-start gap-4 mt-8">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary mb-1">
                    {t("apiKeys.storage.title")}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("apiKeys.storage.desc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "local-llm":
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center p-2 shadow-sm shrink-0">
                  <BrandIcon
                    src="/icons/ollama.svg"
                    alt="Ollama"
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">
                    {t("localLlm.title")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("localLlm.subtitle")}
                  </p>
                </div>
              </div>
            </header>

            <div className="p-6 rounded-2xl bg-muted/20 border border-border/40 space-y-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {t("localLlm.endpoint")}
                  </label>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
                      ollamaStatus === "connected" && "text-emerald-500",
                      ollamaStatus === "disconnected" && "text-red-400",
                      ollamaStatus === "unknown" && "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        ollamaStatus === "connected" &&
                          "bg-emerald-500 animate-pulse",
                        ollamaStatus === "disconnected" && "bg-red-400",
                        ollamaStatus === "unknown" && "bg-muted-foreground/50",
                      )}
                    />
                    {ollamaStatus === "connected"
                      ? t("localLlm.status.connected")
                      : ollamaStatus === "disconnected"
                        ? t("localLlm.status.disconnected")
                        : t("localLlm.status.unknown")}
                  </span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1 group">
                    <Input
                      type="text"
                      placeholder="http://localhost:11434"
                      value={ollamaUrl}
                      onChange={(e) => {
                        setOllamaUrl(e.target.value);
                        setOllamaStatus("unknown");
                      }}
                      className="bg-background/50 border-border/50 rounded-xl px-4 py-5 text-xs font-mono focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleAutoDetect}
                    disabled={isScanning}
                    className={cn(
                      "rounded-xl border-border/50 text-[11px] font-bold h-auto py-2.5 px-6 transition-all duration-300",
                      "hover:bg-primary hover:text-white hover:border-primary",
                      isScanning && "opacity-80",
                    )}
                  >
                    {isScanning ? (
                      <span className="flex items-center gap-2">
                        <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        {t("localLlm.scanning")}
                      </span>
                    ) : (
                      t("localLlm.autoDetect")
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground opacity-70 leading-relaxed mt-1">
                  {t("localLlm.hint")}
                </p>
              </div>
            </div>

            {showTroubleshooter && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-red-500/[0.02] border border-red-500/10 space-y-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-red-500/10 text-red-500 shrink-0">
                    <WarningCircle className="size-6 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[14px] font-bold text-foreground">
                      {t("localLlm.diagnostics.title")}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {t("localLlm.diagnostics.desc")}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/40 pt-5 space-y-4">
                  {ollamaScanDetail && (
                    <p className="text-[10px] font-mono text-red-400/90 break-all leading-relaxed">
                      {ollamaScanDetail}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t("localLlm.diagnostics.os")}
                    </p>
                    <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/30">
                      {(["macos", "windows", "linux"] as const).map((os) => (
                        <button
                          key={os}
                          onClick={() => setSelectedOS(os)}
                          className={cn(
                            "px-3 py-1 text-[10px] font-bold rounded-md capitalize transition-all duration-200",
                            selectedOS === os
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {os}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
                    {selectedOS === "macos" && (
                      <div className="space-y-3">
                        <p>
                          1. Quit the <strong>Ollama</strong> app completely
                          from your menu bar icon.
                        </p>
                        <p>
                          2. In <strong>Terminal</strong>, write CORS settings
                          for the menu-bar app (launchctl alone often does not
                          apply to Ollama.app):
                        </p>
                        <div className="relative group bg-muted/40 border border-border/50 rounded-xl p-3 font-mono text-[10px] text-foreground flex items-center justify-between gap-2">
                          <span className="break-all">
                            {macOllamaEnvFileCommand}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                macOllamaEnvFileCommand,
                              );
                              toast.success(t("localLlm.copied"));
                            }}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        </div>
                        <p>
                          3. Quit Ollama, then restart (or run{" "}
                          <code className="text-foreground">pkill ollama</code>{" "}
                          if needed):
                        </p>
                        <div className="relative group bg-muted/40 border border-border/50 rounded-xl p-3 font-mono text-[10px] text-foreground flex items-center justify-between">
                          <span>open -a Ollama</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText("open -a Ollama");
                              toast.success(t("localLlm.copied"));
                            }}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedOS === "windows" && (
                      <div className="space-y-3">
                        <p>
                          1. Right-click the <strong>Ollama</strong> tray icon
                          in your Windows taskbar and choose{" "}
                          <strong>Quit</strong>.
                        </p>
                        <p>
                          2. Open <strong>PowerShell</strong> and run this
                          command to configure user variables:
                        </p>
                        <div className="relative group bg-muted/40 border border-border/50 rounded-xl p-3 font-mono text-[10px] text-foreground flex items-center justify-between">
                          <span className="break-all">
                            {`[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "${ollamaOriginsValue}", "User")`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "${ollamaOriginsValue}", "User")`,
                              );
                              toast.success(t("localLlm.copied"));
                            }}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        </div>
                        <p>
                          3. Relaunch <strong>Ollama</strong> from your Start
                          menu.
                        </p>
                      </div>
                    )}

                    {selectedOS === "linux" && (
                      <div className="space-y-3">
                        <p>
                          1. Open your terminal and open the service
                          configuration editor:
                        </p>
                        <div className="relative group bg-muted/40 border border-border/50 rounded-xl p-3 font-mono text-[10px] text-foreground flex items-center justify-between">
                          <span>sudo systemctl edit ollama.service</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                "sudo systemctl edit ollama.service",
                              );
                              toast.success(t("localLlm.copied"));
                            }}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        </div>
                        <p>
                          2. Add the environment variable in the file under the{" "}
                          <code>[Service]</code> block and save it:
                        </p>
                        <pre className="bg-muted/30 border border-border/40 rounded-xl p-3 text-[10px] text-foreground font-mono">
                          {`[Service]
Environment="OLLAMA_ORIGINS=*"`}
                        </pre>
                        <p>
                          3. Reload systemd configurations and restart the
                          Ollama service:
                        </p>
                        <div className="relative group bg-muted/40 border border-border/50 rounded-xl p-3 font-mono text-[10px] text-foreground flex items-center justify-between">
                          <span>
                            sudo systemctl daemon-reload && sudo systemctl
                            restart ollama
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                "sudo systemctl daemon-reload && sudo systemctl restart ollama",
                              );
                              toast.success(t("localLlm.copied"));
                            }}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowTroubleshooter(false)}
                    className="text-[11px] font-bold rounded-xl"
                  >
                    {t("localLlm.diagnostics.hide")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAutoDetect}
                    className="text-[11px] font-bold rounded-xl border-red-500/20 hover:bg-red-500/5 hover:border-red-500/30 text-red-400"
                  >
                    {t("localLlm.diagnostics.retry")}
                  </Button>
                </div>
              </motion.div>
            )}

            {ollamaModels.length > 0 ? (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {t("localLlm.discovered", { count: ollamaModels.length })}
                    </h4>
                  </div>
                  <button
                    onClick={handleAutoDetect}
                    className="text-[10px] font-bold uppercase text-primary hover:underline"
                  >
                    {t("localLlm.refresh")}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ollamaModels.map((m) => {
                    const modelId = `ollama/${m.name}`;
                    const sizeInGB = m.size
                      ? `${(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
                      : "Unknown size";
                    const isEnabled = enabledModels.includes(modelId);

                    return (
                      <div
                        key={m.name}
                        className={cn(
                          "flex items-center justify-between p-4.5 rounded-2xl border transition-all duration-300",
                          isEnabled
                            ? "bg-primary/[0.02] border-primary/10 shadow-sm"
                            : "bg-muted/10 border-border/20 opacity-50 grayscale",
                        )}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-sm">
                            <BrandIcon
                              src="/icons/ollama.svg"
                              alt=""
                              className="w-full h-full"
                            />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-[14px] font-bold tracking-tight truncate">
                              {m.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono truncate">
                              <span className="px-1.5 py-0.5 rounded bg-muted/65 uppercase tracking-wider font-bold">
                                {m.details?.parameter_size || "local"}
                              </span>
                              <span>{sizeInGB}</span>
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleModel(modelId)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <div className="p-12 rounded-3xl border border-dashed border-border/60 bg-muted/5 flex flex-col items-center text-center space-y-4">
                <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground shadow-inner">
                  <BrandIcon
                    src="/icons/ollama.svg"
                    alt=""
                    className="size-6 opacity-50"
                  />
                </div>
                <div className="max-w-[320px] space-y-2">
                  <p className="text-[15px] font-bold">
                    {t("localLlm.empty.title")}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t("localLlm.empty.desc")}
                  </p>
                </div>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-primary/[0.03] border border-primary/10 flex items-start gap-4 mt-8">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary mb-1">
                  {t("localLlm.privacy.title")}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("localLlm.privacy.desc")}
                </p>
              </div>
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 max-w-3xl mx-auto">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="absolute -inset-10 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl opacity-20" />
                <h1 className="text-6xl font-extrabold tracking-tighter relative z-10">
                  <span className="text-foreground">Ai</span>
                  <span className="text-primary">BoT</span>
                </h1>
              </div>
              <div className="space-y-2 relative z-10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.6em] ml-[0.6em]">
                  {t("about.tagline")}
                </p>
                <div className="flex items-center justify-center gap-3 opacity-40">
                  <span className="text-[9px] font-bold uppercase tracking-widest">
                    {t("about.version", { version: APP_VERSION })}
                  </span>
                  <div className="size-1 rounded-full bg-border" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">
                    {t("about.edition")}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 rounded-[2.5rem] bg-muted/10 border border-border/40 space-y-4 transition-all hover:bg-muted/20">
                <div className="flex items-center gap-3 text-primary">
                  <User weight="fill" className="size-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {t("about.developer")}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground">
                    Suryanshu Nabheet
                  </p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {t("about.developer.bio")}
                  </p>
                </div>
              </div>

              <div className="p-8 rounded-[2.5rem] bg-muted/10 border border-border/40 space-y-4 transition-all hover:bg-muted/20">
                <div className="flex items-center gap-3 text-primary">
                  <Cpu weight="fill" className="size-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {t("about.stack")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight">
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-primary/40" />{" "}
                    Next.js 15.5
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-primary/40" />{" "}
                    React 19
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-primary/40" />{" "}
                    TypeScript 5.8
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-primary/40" />{" "}
                    Tailwind 4.0
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-center gap-2 px-1">
                <div className="h-px w-12 bg-border/50" />
                <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">
                  {t("about.foundation")}
                </h4>
                <div className="h-px w-12 bg-border/50" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  {
                    title: t("about.feature.orchestration.title"),
                    desc: t("about.feature.orchestration.desc"),
                    icon: ShieldCheck,
                  },
                  {
                    title: t("about.feature.coding.title"),
                    desc: t("about.feature.coding.desc"),
                    icon: ArrowSquareOut,
                  },
                  {
                    title: t("about.feature.research.title"),
                    desc: t("about.feature.research.desc"),
                    icon: Info,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="group p-6 rounded-[2rem] bg-muted/5 border border-border/30 hover:border-primary/20 hover:bg-primary/[0.01] transition-all duration-300 flex items-start gap-6"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-background border border-border/50 flex items-center justify-center text-primary shrink-0 shadow-sm transition-transform group-hover:scale-110">
                      <item.icon weight="bold" className="size-5" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-foreground tracking-tight">
                        {item.title}
                      </p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-8 text-center pt-8">
              <div className="h-px w-full max-w-[200px] bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="flex gap-10 grayscale opacity-30 hover:opacity-100 hover:grayscale-0 transition-all duration-700 cursor-default">
                <BrandIcon src="/icons/meta.svg" alt="" className="size-6" />
                <BrandIcon src="/icons/google.svg" alt="" className="size-6" />
                <BrandIcon src="/icons/openai.svg" alt="" className="size-6" />
                <BrandIcon src="/icons/nvidia.svg" alt="" className="size-6" />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden border-t border-border/50 bg-background xl:flex-row">
      {/* Settings Sidebar - AGENT MODE INSPIRED SIZING */}
      <div className="relative z-20 flex w-full shrink-0 flex-col border-b border-border/50 bg-muted/[0.02] xl:w-[260px] xl:border-r xl:border-b-0">
        <div className="px-4 pt-4 pb-2 sm:px-6 xl:p-7 xl:pb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-2 rounded-full bg-primary/80" />
            <h2 className="text-[12px] font-bold uppercase tracking-[0.3em] text-foreground">
              {t("settings.title")}
            </h2>
          </div>
          <p className="hidden text-[9px] font-medium uppercase tracking-widest text-muted-foreground opacity-40 xl:block">
            {t("settings.subtitle")}
          </p>
        </div>

        <div className="px-4 pb-4 sm:px-6 xl:hidden">
          <label className="sr-only" htmlFor="settings-section">
            {t("settings.title")}
          </label>
          <select
            id="settings-section"
            value={activeSection}
            onChange={(event) =>
              setActiveSection(event.target.value as SettingsSection)
            }
            className="h-11 w-full cursor-pointer rounded-xl border border-border/50 bg-background px-3 text-sm font-bold text-foreground outline-none transition-colors focus:ring-2 focus:ring-primary/30"
          >
            {SECTIONS.map((section) => (
              <option key={section.id} value={section.id}>
                {t(section.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden w-full gap-1 overflow-x-auto px-2 pb-3 scrollbar-none xl:flex xl:flex-1 xl:flex-col xl:gap-1 xl:overflow-y-auto xl:px-3 xl:pb-0">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "inline-flex h-10 shrink-0 cursor-pointer items-center justify-start gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold tracking-tight outline-none transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 xl:w-full xl:gap-3 xl:px-4",
                activeSection === section.id
                  ? "bg-primary/[0.08] text-primary"
                  : "bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <section.icon
                className={cn(
                  "size-4.5 transition-all duration-300",
                  activeSection === section.id
                    ? "text-primary scale-110"
                    : "text-muted-foreground/40",
                )}
              />
              <span className="truncate">{t(section.labelKey)}</span>
            </button>
          ))}
        </div>

        <div className="hidden p-8 xl:block">
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-center">
            <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.4em]">
              AiBoT
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {/* Navigation Header */}
        <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border/30 px-4 backdrop-blur-sm sm:px-6 xl:h-16 xl:px-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">
              {t("settings.breadcrumb")}
            </span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">
              {activeSection.replace("-", " ")}
            </span>
          </div>
          <button
            onClick={() => setViewMode("direct")}
            className="group p-2.5 rounded-2xl bg-muted/20 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <X className="size-4.5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent">
          <div className="mx-auto w-full max-w-4xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 xl:px-14 xl:py-16">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
