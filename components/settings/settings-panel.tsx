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
import type { SettingsSection } from "@/lib/settings-sections";
import {
  SettingsCard,
  SettingsPageHeader,
  SettingsRow,
  SettingsSectionLabel,
  settingsControlClass,
} from "@/components/settings/settings-ui";

export type { SettingsSection };

export type SettingsPanelProps = {
  onClose: () => void;
  initialSection?: SettingsSection;
  onSectionChange?: (section: SettingsSection) => void;
  /** Modal fills a fixed dialog; page fills the main column. */
  variant?: "modal" | "page";
};

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

function CopyableCommand({
  value,
  onCopied,
}: {
  value: string;
  onCopied: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 font-mono text-[11px] text-foreground">
      <span className="min-w-0 break-all">{value}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          onCopied();
        }}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Copy"
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}

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

export function SettingsPanel({
  onClose,
  initialSection = "general",
  onSectionChange,
  variant = "modal",
}: SettingsPanelProps) {
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
    useState<SettingsSection>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const selectSection = useCallback(
    (section: SettingsSection) => {
      setActiveSection(section);
      onSectionChange?.(section);
    },
    [onSectionChange],
  );
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
          <div className="animate-in fade-in duration-200">
            <SettingsPageHeader
              title={t("general.title")}
              description={t("general.subtitle")}
            />

            <SettingsSectionLabel>
              {t("general.group.preferences")}
            </SettingsSectionLabel>
            <SettingsCard>
              <SettingsRow
                icon={<Globe className="size-4" weight="duotone" />}
                label={t("general.language.title")}
                description={t("general.language.desc")}
              >
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                  className={cn(settingsControlClass, "min-w-[8.5rem]")}
                  aria-label={t("general.language.title")}
                >
                  {LOCALES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nativeLabel}
                    </option>
                  ))}
                </select>
              </SettingsRow>

              <SettingsRow
                icon={<MoonStars className="size-4" weight="duotone" />}
                label={t("general.theme.title")}
                description={t("general.theme.desc")}
              >
                <select
                  value={themeValue}
                  onChange={(e) => setTheme(e.target.value)}
                  className={cn(settingsControlClass, "min-w-[8.5rem]")}
                  aria-label={t("general.theme.title")}
                >
                  <option value="system">
                    {t("general.theme.system")}
                    {themeReady && resolvedTheme ? ` (${resolvedTheme})` : ""}
                  </option>
                  <option value="light">{t("general.theme.light")}</option>
                  <option value="dark">{t("general.theme.dark")}</option>
                </select>
              </SettingsRow>
            </SettingsCard>

            <SettingsSectionLabel className="mt-6">
              {t("general.group.alerts")}
            </SettingsSectionLabel>
            <SettingsCard>
              <SettingsRow
                icon={<Bell className="size-4" weight="duotone" />}
                label={t("general.notifications.title")}
                description={t("general.notifications.desc")}
              >
                <Switch
                  checked={desktopNotifications}
                  onCheckedChange={handleNotificationsToggle}
                  aria-label={t("general.notifications.title")}
                />
              </SettingsRow>

              <SettingsRow
                icon={<SpeakerHigh className="size-4" weight="duotone" />}
                label={t("general.sound.title")}
                description={t("general.sound.desc")}
              >
                <Switch
                  checked={completionSound}
                  onCheckedChange={setCompletionSound}
                  aria-label={t("general.sound.title")}
                />
              </SettingsRow>
            </SettingsCard>
          </div>
        );

      case "models":
        const activeProviders = Object.keys(apiKeys).filter(
          (p) => !!apiKeys[p as keyof ApiKeys],
        );

        return (
          <div className="animate-in fade-in duration-200">
            <SettingsPageHeader
              title={t("models.title")}
              description={t("models.subtitle")}
            />

            <div className="space-y-8">
              <section>
                <SettingsSectionLabel>
                  {t("models.platform")}
                </SettingsSectionLabel>
                <SettingsCard>
                  {MODELS.map((m) => (
                    <SettingsRow
                      key={m.id}
                      icon={
                        <BrandIcon
                          src={m.logo || "/icons/ai.svg"}
                          alt=""
                          className="size-4"
                        />
                      }
                      label={m.name.replace(" (Free)", "")}
                      description={t("models.platformOptimized")}
                    >
                      <Switch
                        checked={enabledModels.includes(m.id)}
                        onCheckedChange={() => toggleModel(m.id)}
                      />
                    </SettingsRow>
                  ))}
                </SettingsCard>
              </section>

              {activeProviders.length > 0 && (
                <div className="space-y-6">
                  <div>
                    <SettingsSectionLabel>
                      {t("models.external")}
                    </SettingsSectionLabel>
                    <p className="-mt-1 mb-3 px-0.5 text-[12px] text-muted-foreground">
                      {t("models.externalDesc")}
                    </p>
                  </div>

                  {activeProviders.map((providerId) => {
                    const provider = PROVIDERS.find((p) => p.id === providerId);
                    const models = getModelsForProvider(providerId);
                    if (models.length === 0) return null;

                    return (
                      <section key={providerId}>
                        <SettingsSectionLabel>
                          {provider?.name} {t("models.ecosystem")}
                        </SettingsSectionLabel>
                        <SettingsCard>
                          {models.map((m) => (
                            <SettingsRow
                              key={m.id}
                              icon={
                                <BrandIcon
                                  src={provider?.icon || "/icons/ai.svg"}
                                  alt=""
                                  className="size-4"
                                />
                              }
                              label={m.name}
                              description={m.id}
                            >
                              <Switch
                                checked={enabledModels.includes(m.id)}
                                onCheckedChange={() => toggleModel(m.id)}
                              />
                            </SettingsRow>
                          ))}
                        </SettingsCard>
                      </section>
                    );
                  })}
                </div>
              )}

              {activeProviders.length === 0 && (
                <SettingsCard>
                  <div className="px-4 py-8 text-center">
                    <p className="text-[13px] font-medium text-foreground">
                      {t("models.unlock.title")}
                    </p>
                    <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
                      {t("models.unlock.desc")}{" "}
                      <button
                        type="button"
                        onClick={() => selectSection("api-keys")}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {t("models.unlock.link")}
                      </button>
                    </p>
                  </div>
                </SettingsCard>
              )}
            </div>
          </div>
        );

      case "api-keys":
        return (
          <div className="animate-in fade-in duration-200">
            <SettingsPageHeader
              title={t("apiKeys.title")}
              description={t("apiKeys.subtitle")}
            />

            <div className="space-y-3">
              {PROVIDERS.map((provider) => (
                <SettingsCard key={provider.id}>
                  <div className="space-y-3 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60">
                          <BrandIcon
                            src={provider.icon}
                            alt=""
                            className="size-4"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium">
                            {provider.name}
                          </p>
                          <p className="text-[12px] text-muted-foreground">
                            {t("apiKeys.enterKey", {
                              provider: provider.name,
                            })}
                          </p>
                        </div>
                      </div>
                      {apiKeys[provider.id as keyof ApiKeys] ? (
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          {t("apiKeys.active")}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
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
                        className="h-9 flex-1 rounded-lg border-border/60 bg-background font-mono text-[12px]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
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
                        className="h-9 rounded-lg px-4 text-[12px] font-medium"
                      >
                        {verifyingProvider === provider.id
                          ? t("apiKeys.checking")
                          : t("apiKeys.verify")}
                      </Button>
                    </div>
                  </div>
                </SettingsCard>
              ))}

              <p className="px-1 pt-2 text-[12px] leading-relaxed text-muted-foreground">
                {t("apiKeys.storage.desc")}
              </p>
            </div>
          </div>
        );

      case "local-llm":
        return (
          <div className="animate-in fade-in duration-200 space-y-5">
            <SettingsPageHeader
              title={t("localLlm.title")}
              description={t("localLlm.subtitle")}
            />

            <SettingsCard>
              <div className="space-y-3 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-medium">
                    {t("localLlm.endpoint")}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[11px] font-medium",
                      ollamaStatus === "connected" &&
                        "text-emerald-600 dark:text-emerald-400",
                      ollamaStatus === "disconnected" && "text-red-500",
                      ollamaStatus === "unknown" && "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        ollamaStatus === "connected" && "bg-emerald-500",
                        ollamaStatus === "disconnected" && "bg-red-500",
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
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="text"
                    placeholder="http://localhost:11434"
                    value={ollamaUrl}
                    onChange={(e) => {
                      setOllamaUrl(e.target.value);
                      setOllamaStatus("unknown");
                    }}
                    className="h-9 flex-1 rounded-lg border-border/60 bg-background font-mono text-[12px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoDetect}
                    disabled={isScanning}
                    className="h-9 rounded-lg px-4 text-[12px] font-medium"
                  >
                    {isScanning
                      ? t("localLlm.scanning")
                      : t("localLlm.autoDetect")}
                  </Button>
                </div>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  {t("localLlm.hint")}
                </p>
              </div>
            </SettingsCard>

            {showTroubleshooter && (
              <SettingsCard className="border-red-500/15 bg-red-500/[0.03]">
                <div className="space-y-4 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-red-500 ring-1 ring-red-500/20">
                      <WarningCircle className="size-4" weight="duotone" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-[13px] font-medium text-foreground">
                        {t("localLlm.diagnostics.title")}
                      </p>
                      <p className="text-[12px] leading-snug text-muted-foreground">
                        {t("localLlm.diagnostics.desc")}
                      </p>
                    </div>
                  </div>

                  {ollamaScanDetail ? (
                    <p className="break-all rounded-lg bg-background/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-red-600/90 dark:text-red-400/90">
                      {ollamaScanDetail}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                      {t("localLlm.diagnostics.os")}
                    </p>
                    <div className="flex rounded-lg border border-border/50 bg-background p-0.5">
                      {(["macos", "windows", "linux"] as const).map((os) => (
                        <button
                          key={os}
                          type="button"
                          onClick={() => setSelectedOS(os)}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                            selectedOS === os
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {os}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 text-[12px] leading-relaxed text-muted-foreground">
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
                        <CopyableCommand
                          value={macOllamaEnvFileCommand}
                          onCopied={() => toast.success(t("localLlm.copied"))}
                        />
                        <p>
                          3. Quit Ollama, then restart (or run{" "}
                          <code className="text-foreground">pkill ollama</code>{" "}
                          if needed):
                        </p>
                        <CopyableCommand
                          value="open -a Ollama"
                          onCopied={() => toast.success(t("localLlm.copied"))}
                        />
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
                        <CopyableCommand
                          value={`[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "${ollamaOriginsValue}", "User")`}
                          onCopied={() => toast.success(t("localLlm.copied"))}
                        />
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
                        <CopyableCommand
                          value="sudo systemctl edit ollama.service"
                          onCopied={() => toast.success(t("localLlm.copied"))}
                        />
                        <p>
                          2. Add the environment variable in the file under the{" "}
                          <code>[Service]</code> block and save it:
                        </p>
                        <pre className="overflow-x-auto rounded-lg border border-border/50 bg-background px-3 py-2 font-mono text-[11px] text-foreground">
                          {`[Service]\nEnvironment="OLLAMA_ORIGINS=*"`}
                        </pre>
                        <p>
                          3. Reload systemd configurations and restart the
                          Ollama service:
                        </p>
                        <CopyableCommand
                          value="sudo systemctl daemon-reload && sudo systemctl restart ollama"
                          onCopied={() => toast.success(t("localLlm.copied"))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTroubleshooter(false)}
                      className="h-8 rounded-lg text-[12px] font-medium"
                    >
                      {t("localLlm.diagnostics.hide")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAutoDetect}
                      className="h-8 rounded-lg text-[12px] font-medium"
                    >
                      {t("localLlm.diagnostics.retry")}
                    </Button>
                  </div>
                </div>
              </SettingsCard>
            )}

            {ollamaModels.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <SettingsSectionLabel className="mb-0">
                    {t("localLlm.discovered", { count: ollamaModels.length })}
                  </SettingsSectionLabel>
                  <button
                    type="button"
                    onClick={handleAutoDetect}
                    className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("localLlm.refresh")}
                  </button>
                </div>
                <SettingsCard>
                  {ollamaModels.map((m) => {
                    const modelId = `ollama/${m.name}`;
                    const sizeInGB = m.size
                      ? `${(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
                      : "Unknown size";
                    const isEnabled = enabledModels.includes(modelId);
                    const meta = [
                      m.details?.parameter_size || "local",
                      sizeInGB,
                    ].join(" · ");

                    return (
                      <SettingsRow
                        key={m.name}
                        icon={
                          <BrandIcon
                            src="/icons/ollama.svg"
                            alt=""
                            className="size-4"
                          />
                        }
                        label={m.name}
                        description={meta}
                      >
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleModel(modelId)}
                        />
                      </SettingsRow>
                    );
                  })}
                </SettingsCard>
              </div>
            ) : (
              <SettingsCard>
                <div className="px-4 py-8 text-center">
                  <p className="text-[13px] font-medium text-foreground">
                    {t("localLlm.empty.title")}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
                    {t("localLlm.empty.desc")}
                  </p>
                </div>
              </SettingsCard>
            )}

            <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {t("localLlm.privacy.title")}
              </span>
              {" — "}
              {t("localLlm.privacy.desc")}
            </p>
          </div>
        );

      case "about":
        return (
          <div className="animate-in fade-in duration-200 space-y-6">
            <SettingsPageHeader
              title="AiBoT"
              description={`${t("about.tagline")} · ${t("about.version", { version: APP_VERSION })}`}
            />

            <SettingsCard>
              <SettingsRow
                icon={<User className="size-4" weight="duotone" />}
                label={t("about.developer")}
                description={t("about.developer.bio")}
              >
                <span className="text-[12px] font-medium text-muted-foreground">
                  Suryanshu Nabheet
                </span>
              </SettingsRow>
              <SettingsRow
                icon={<Cpu className="size-4" weight="duotone" />}
                label={t("about.stack")}
                description="Next.js · React · TypeScript · Tailwind"
              />
            </SettingsCard>

            <SettingsSectionLabel>{t("about.foundation")}</SettingsSectionLabel>
            <SettingsCard>
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
              ].map((item) => (
                <SettingsRow
                  key={item.title}
                  icon={<item.icon className="size-4" weight="duotone" />}
                  label={item.title}
                  description={item.desc}
                />
              ))}
            </SettingsCard>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "relative flex min-h-0 w-full max-w-full overflow-hidden bg-background",
        variant === "modal"
          ? "h-full flex-col sm:flex-row"
          : "h-full flex-col border-t border-border/50 xl:flex-row",
      )}
    >
      {/* Settings Sidebar */}
      <div
        className={cn(
          "relative z-20 flex w-full shrink-0 flex-col border-border/40 bg-muted/30",
          variant === "modal"
            ? "border-b sm:w-[220px] sm:border-b-0 sm:border-r"
            : "border-b xl:w-[240px] xl:border-r xl:border-b-0",
        )}
      >
        <div
          className={cn(
            "px-4 pt-5 pb-3",
            variant === "modal" ? "sm:px-3 sm:pt-5" : "sm:px-6 xl:px-4 xl:pt-6",
          )}
        >
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("settings.title")}
          </h2>
        </div>

        <div
          className={cn(
            "px-4 pb-3",
            variant === "modal" ? "sm:hidden" : "xl:hidden",
          )}
        >
          <label className="sr-only" htmlFor="settings-section">
            {t("settings.title")}
          </label>
          <select
            id="settings-section"
            value={activeSection}
            onChange={(event) =>
              selectSection(event.target.value as SettingsSection)
            }
            className={cn(settingsControlClass, "h-10 w-full")}
          >
            {SECTIONS.map((section) => (
              <option key={section.id} value={section.id}>
                {t(section.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <nav
          aria-label={t("settings.title")}
          className={cn(
            "hidden flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3",
            variant === "modal" ? "sm:flex" : "xl:flex",
          )}
        >
          {SECTIONS.map((section) => {
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => selectSection(section.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
              >
                <section.icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-foreground" : "text-muted-foreground/70",
                  )}
                  weight={active ? "fill" : "regular"}
                />
                <span className="truncate">{t(section.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        <div
          className={cn(
            "mt-auto hidden px-3 pb-4",
            variant === "modal" ? "sm:block" : "xl:block",
          )}
        >
          <p className="rounded-xl px-2.5 py-2 text-[10px] font-medium tracking-wide text-muted-foreground/50">
            AiBoT
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 px-4 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span className="text-muted-foreground/50">
              {t("settings.title")}
            </span>
            <span className="mx-1.5 text-muted-foreground/40">/</span>
            <span className="text-foreground/80">
              {t(
                SECTIONS.find((s) => s.id === activeSection)?.labelKey ??
                  "settings.section.general",
              )}
            </span>
          </p>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" weight="bold" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div
            className={cn(
              "mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-6",
              variant === "page" && "xl:max-w-3xl xl:px-10 xl:py-10",
            )}
          >
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
