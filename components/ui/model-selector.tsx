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
import { Check, ChevronsUpDown, Cpu } from "lucide-react";
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
  thinkingEnabled?: boolean;
  onThinkingChange?: (enabled: boolean) => void;
  showModelList?: boolean;
  triggerVariant?: "default" | "compact";
}

type SelectorModel = {
  id: string;
  name: string;
  logo?: string;
  provider?: string;
};

function displayModelName(name: string) {
  return name.replace(" (Free)", "");
}

function ModelListItem({
  model,
  label,
  selected,
  onSelect,
}: {
  model: SelectorModel;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`${label} ${model.id}`}
      onSelect={onSelect}
      className="cursor-pointer flex items-center justify-between gap-2 rounded-md px-2 py-2 text-xs aria-selected:bg-muted/70"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/40 bg-background p-1"
        >
          {model.logo ? (
            <BrandIcon src={model.logo} alt="" className="size-full" />
          ) : (
            <Cpu className="size-4 text-muted-foreground" />
          )}
        </div>
        <span className="min-w-0 truncate font-medium text-[13px] text-foreground">
          {label}
        </span>
      </div>
      {selected && (
        <Check className="size-3.5 shrink-0 text-foreground/70" strokeWidth={2.5} />
      )}
    </CommandItem>
  );
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
  const externalModels = filteredModels.filter(
    (m) => m.provider !== "platform",
  );

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

  const fullModelLabel = selectedModelObj
    ? displayModelName(selectedModelObj.name)
    : t("model.select");

  const triggerLabel = showModelList ? fullModelLabel : t("model.thinkingMenu");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          aria-label={triggerLabel}
          title={showModelList ? fullModelLabel : undefined}
          disabled={disabled}
          className={cn(
            "h-9 shrink-0 rounded-full border border-border/50 bg-muted/30 px-3 font-medium text-muted-foreground text-xs hover:bg-muted/60 hover:text-foreground focus:ring-0 sm:h-8",
            triggerVariant === "compact"
              ? "min-w-[9.25rem] max-w-[min(58vw,13.5rem)] justify-between gap-2 sm:min-w-[10rem] sm:max-w-[11.5rem] md:max-w-[13rem]"
              : "w-fit max-w-none justify-between gap-2",
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {showModelList && selectedModelObj && (
              <BrandIcon
                src={selectedModelObj.logo || "/icons/ai.svg"}
                alt=""
                className="size-3.5 shrink-0 sm:size-4"
              />
            )}
            {showModelList ? (
              <span className="min-w-0 truncate text-left text-[11px] font-medium text-foreground sm:text-xs">
                {fullModelLabel}
              </span>
            ) : (
              <span className="truncate text-left text-[11px] font-medium text-foreground sm:text-xs">
                {t("model.thinkingMenu")}
              </span>
            )}
          </span>
          <ChevronsUpDown className="size-3 shrink-0 opacity-40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[min(calc(100vw-1.5rem),280px)] border border-border/80 p-0 shadow-md"
        align="start"
        sideOffset={6}
      >
        {showThinking && (
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2.5">
            <span className="text-sm font-medium text-foreground">
              {t("model.thinkingPower")}
            </span>
            <Switch
              checked={thinkingEnabled}
              onCheckedChange={onThinkingChange}
              aria-label={t("model.thinkingPower")}
              className="shrink-0 data-[state=checked]:bg-foreground"
            />
          </div>
        )}

        {showModelList && (
          <Command className="overflow-hidden rounded-none rounded-b-md">
            <CommandInput
              placeholder={t("model.search")}
              className="h-9 border-0 text-xs"
            />
            <CommandList className="max-h-[min(50vh,280px)] scrollbar-thin">
              <CommandEmpty className="py-4 text-xs text-muted-foreground">
                {t("model.empty")}
              </CommandEmpty>

              {platformModels.length > 0 && (
                <CommandGroup
                  heading={t("model.platform")}
                  className="px-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground/80"
                >
                  {platformModels.map((model) => (
                    <ModelListItem
                      key={model.id}
                      model={model}
                      label={displayModelName(model.name)}
                      selected={selectedModel === model.id}
                      onSelect={() => handleValueChange(model.id)}
                    />
                  ))}
                </CommandGroup>
              )}

              {externalModels.length > 0 && (
                <>
                  {platformModels.length > 0 && (
                    <CommandSeparator className="my-1 opacity-40" />
                  )}
                  <CommandGroup
                    heading={t("model.external")}
                    className="px-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground/80"
                  >
                    {externalModels.map((model) => (
                      <ModelListItem
                        key={model.id}
                        model={model}
                        label={model.name}
                        selected={selectedModel === model.id}
                        onSelect={() => handleValueChange(model.id)}
                      />
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
