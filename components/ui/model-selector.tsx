/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useModel } from "@/hooks/use-model";
import { useSettings } from "@/contexts/settings-context";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Cpu, Sparkles } from "lucide-react";
import { Brain } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/use-translation";
import { BrandIcon } from "@/components/ui/brand-icon";

interface ModelSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  triggerClassName?: string;
  modelStorageKey?: string;
  /** Deep thinking (two-stage reasoning) */
  thinkingEnabled?: boolean;
  onThinkingChange?: (enabled: boolean) => void;
  /** When false, only the thinking toggle is shown (e.g. arena shared input). */
  showModelList?: boolean;
  /** Compact icon trigger for tight toolbars */
  triggerVariant?: "default" | "compact";
}

export function ModelSelector({
  value,
  onValueChange,
  disabled = false,
  triggerClassName,
  modelStorageKey = "preferredModel",
  thinkingEnabled = false,
  onThinkingChange,
  showModelList = true,
  triggerVariant = "default",
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { availableModels, enabledModels } = useSettings();

  const filteredModels = useMemo(() => {
    return availableModels.filter((m) => enabledModels.includes(m.id));
  }, [availableModels, enabledModels]);

  const platformModels = filteredModels.filter(
    (m) => m.provider === "platform",
  );
  const customModels = filteredModels.filter((m) => m.provider !== "platform");

  const { modelId: persistedModelId, setModelId } = useModel({
    initialModel: value ?? filteredModels[0]?.id,
    storageKey: modelStorageKey,
    persistToLocalStorage: true,
  });

  const selectedModel = value ?? persistedModelId;

  useEffect(() => {
    if (value && value !== persistedModelId) {
      setModelId(value);
    }
  }, [value, persistedModelId, setModelId]);

  const handleValueChange = (newValue: string) => {
    setModelId(newValue);
    setOpen(false);
    onValueChange?.(newValue);
  };

  const selectedModelObj = availableModels.find((m) => m.id === selectedModel);
  const showThinking = typeof onThinkingChange === "function";

  const triggerLabel = showModelList
    ? (selectedModelObj?.name ?? t("model.select"))
    : t("model.thinkingMenu");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          aria-label={triggerLabel}
          disabled={disabled}
          className={cn(
            "h-9 shrink-0 rounded-full border-none bg-muted/50 px-2 font-medium text-muted-foreground text-xs hover:bg-muted hover:text-foreground focus:ring-0 sm:h-8",
            triggerVariant === "compact"
              ? "max-w-[min(38vw,9.5rem)] justify-start gap-1"
              : "w-fit max-w-[min(42vw,160px)] sm:max-w-none justify-between",
            thinkingEnabled &&
              "ring-1 ring-amber-400/30 bg-amber-400/[0.06] text-foreground",
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {thinkingEnabled ? (
              <Brain className="size-4 shrink-0 text-amber-500" weight="fill" />
            ) : showModelList && selectedModelObj ? (
              <BrandIcon
                src={selectedModelObj.logo || "/icons/ai.svg"}
                alt=""
                className="size-3.5 sm:size-4 shrink-0"
              />
            ) : (
              <Sparkles className="size-3.5 shrink-0 opacity-60" />
            )}
            {showModelList && (
              <span className="truncate text-left">
                {selectedModelObj
                  ? selectedModelObj.name.replace(" (Free)", "")
                  : t("model.select")}
              </span>
            )}
            {!showModelList && (
              <span className="truncate text-left text-[11px] font-semibold">
                {thinkingEnabled
                  ? t("model.thinkingShort")
                  : t("model.thinkingOffShort")}
              </span>
            )}
          </span>
          <ChevronsUpDown className="ml-0.5 size-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[min(calc(100vw-1.5rem),300px)] p-0 shadow-2xl border-border/50"
        align="start"
        sideOffset={6}
      >
        {showThinking && (
          <div className="border-b border-border/50 p-2.5">
            <div
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-colors",
                thinkingEnabled
                  ? "border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-violet-500/5 to-emerald-500/5"
                  : "border-border/40 bg-muted/30",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">
                  {t("model.thinkingPower")}
                </p>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  {t("model.thinkingHint")}
                </p>
              </div>
              <Switch
                checked={thinkingEnabled}
                onCheckedChange={onThinkingChange}
                aria-label={t("model.thinkingPower")}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </div>
        )}

        {showModelList && (
          <Command className="rounded-none rounded-b-xl overflow-hidden">
            <CommandInput
              placeholder={t("model.search")}
              className="h-9 text-xs"
            />
            <CommandList className="max-h-[min(50vh,280px)] scrollbar-thin">
              <CommandEmpty className="text-xs py-4">
                {t("model.empty")}
              </CommandEmpty>

              {platformModels.length > 0 && (
                <CommandGroup heading={t("model.platform")} className="px-2">
                  {platformModels.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={`${model.name} ${model.summary || ""} ${model.id}`}
                      onSelect={() => handleValueChange(model.id)}
                      className="cursor-pointer py-2.5 px-2 text-xs flex justify-between items-center rounded-lg my-0.5 hover:bg-primary/[0.03]"
                    >
                      <div className="flex items-center gap-3 w-full min-w-0">
                        <div className="size-8 rounded-lg bg-background border border-border/50 flex items-center justify-center p-1.5 shrink-0">
                          <BrandIcon
                            src={model.logo || "/icons/ai.svg"}
                            alt={model.name}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-[13px] text-foreground truncate">
                            {model.name.replace(" (Free)", "")}
                          </span>
                          {model.summary && (
                            <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1 opacity-70">
                              {model.summary}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedModel === model.id && (
                        <Check className="size-3.5 shrink-0 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {customModels.length > 0 && (
                <>
                  <CommandSeparator className="my-1 opacity-50" />
                  <CommandGroup heading={t("model.external")} className="px-2">
                    {customModels.map((model) => (
                      <CommandItem
                        key={model.id}
                        value={`${model.name} ${model.id}`}
                        onSelect={() => handleValueChange(model.id)}
                        className="cursor-pointer py-2.5 px-2 text-xs flex justify-between items-center rounded-lg my-0.5 hover:bg-emerald-500/[0.03]"
                      >
                        <div className="flex items-center gap-3 w-full min-w-0">
                          <div className="size-8 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 flex items-center justify-center p-1.5 shrink-0 text-emerald-500 overflow-hidden">
                            {model.logo ? (
                              <BrandIcon
                                src={model.logo}
                                alt=""
                                className="w-full h-full"
                              />
                            ) : (
                              <Cpu className="size-5" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[13px] text-foreground truncate">
                              {model.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider opacity-70">
                              {model.provider}
                            </span>
                          </div>
                        </div>
                        {selectedModel === model.id && (
                          <Check className="size-3.5 shrink-0 text-emerald-500" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
