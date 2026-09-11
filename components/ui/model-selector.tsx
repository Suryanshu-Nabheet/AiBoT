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
import { Check, ChevronDown, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  ThinkingModeSwitch,
  thinkingAccentTextClass,
} from "@/components/ui/thinking-mode-switch";

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
  let label = name.replace(" (Free)", "");
  // Logo already indicates OpenRouter; keep the trigger label short and readable.
  if (label.startsWith("OpenRouter ")) {
    label = label.slice("OpenRouter ".length);
  }
  return label;
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
      className="cursor-pointer flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-blue-500/10 dark:aria-selected:bg-blue-400/15"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/40 bg-background p-0.5">
          {model.logo ? (
            <BrandIcon src={model.logo} alt="" className="size-full" />
          ) : (
            <Cpu className="size-3.5 text-muted-foreground" />
          )}
        </div>
        <span
          className={cn(
            "min-w-0 truncate font-medium",
            selected ? "text-foreground" : "text-foreground/90",
          )}
        >
          {label}
        </span>
      </div>
      {selected && (
        <Check className="size-4 shrink-0 text-foreground/75" strokeWidth={2} />
      )}
    </CommandItem>
  );
}

function ThinkingMenuRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2.5"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span
        className={cn(
          "text-sm font-medium",
          checked ? thinkingAccentTextClass : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <ThinkingModeSwitch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
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
          title={
            showModelList && selectedModelObj
              ? selectedModelObj.name.replace(" (Free)", "")
              : undefined
          }
          disabled={disabled}
          className={cn(
            "h-9 min-w-0 gap-1.5 rounded-lg border-0 bg-transparent px-2 font-medium hover:bg-muted/50 focus:ring-0 sm:h-8",
            triggerVariant === "compact"
              ? "max-w-[min(62vw,14rem)] shrink-0 justify-start sm:max-w-[12rem]"
              : "w-fit max-w-none shrink-0 justify-start",
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {showModelList && selectedModelObj && (
              <BrandIcon
                src={selectedModelObj.logo || "/icons/ai.svg"}
                alt=""
                className="size-4 shrink-0 opacity-90"
              />
            )}
            {showModelList ? (
              <span
                className={cn(
                  "min-w-0 truncate text-left text-sm font-medium",
                  thinkingEnabled ? thinkingAccentTextClass : "text-foreground",
                )}
              >
                {fullModelLabel}
              </span>
            ) : (
              <span className="truncate text-left text-sm font-medium text-foreground">
                {t("model.thinkingMenu")}
              </span>
            )}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[min(calc(100vw-1.5rem),300px)] overflow-hidden rounded-xl border border-border/80 p-0 shadow-lg"
        align="start"
        sideOffset={8}
      >
        {showModelList ? (
          <Command className="rounded-none bg-popover">
            <CommandInput
              placeholder={t("model.search")}
              className="h-10 border-0 border-b border-border/50 text-sm"
            />
            {showThinking && onThinkingChange && (
              <ThinkingMenuRow
                label={t("model.thinkingPower")}
                checked={thinkingEnabled}
                onCheckedChange={onThinkingChange}
              />
            )}
            <CommandList className="max-h-[min(50vh,300px)] scrollbar-thin p-1">
              <CommandEmpty className="py-6 text-sm text-muted-foreground">
                {t("model.empty")}
              </CommandEmpty>

              {platformModels.length > 0 && (
                <CommandGroup
                  heading={t("model.platform")}
                  className="px-0.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
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
                    <CommandSeparator className="my-1 opacity-50" />
                  )}
                  <CommandGroup
                    heading={t("model.external")}
                    className="px-0.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
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
        ) : (
          showThinking &&
          onThinkingChange && (
            <div className="p-1">
              <ThinkingMenuRow
                label={t("model.thinkingPower")}
                checked={thinkingEnabled}
                onCheckedChange={onThinkingChange}
              />
            </div>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
