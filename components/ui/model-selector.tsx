/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { MODELS, ModelFull } from "@/lib/types";
import { useModel } from "@/hooks/use-model";
import { useSettings } from "@/contexts/settings-context";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Cpu } from "lucide-react";
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

interface ModelSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  value,
  onValueChange,
  disabled = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { availableModels, enabledModels } = useSettings();
  
  const filteredModels = useMemo(() => {
    return availableModels.filter(m => enabledModels.includes(m.id));
  }, [availableModels, enabledModels]);
  
  const platformModels = filteredModels.filter(m => m.provider === "platform");
  const customModels = filteredModels.filter(m => m.provider !== "platform");

  const { modelId: persistedModelId, setModelId } = useModel({
    initialModel: value ?? (filteredModels[0]?.id),
    storageKey: "preferredModel",
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

    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  const selectedModelObj = availableModels.find((m) => m.id === selectedModel);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-8 w-fit max-w-[160px] sm:max-w-none border-none bg-muted/50 px-2 font-medium text-muted-foreground text-xs hover:bg-muted hover:text-foreground focus:ring-0 justify-between items-center flex"
        >
          {selectedModelObj ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <img
                src={selectedModelObj.logo || "/icons/ai.svg"}
                alt={selectedModelObj.name}
                className="size-3.5 sm:size-4 object-contain shrink-0"
                onError={(e) => {
                  e.currentTarget.src = "/icons/ai.svg";
                }}
              />
              <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-[160px]">
                {selectedModelObj.name}
              </span>
            </div>
          ) : (
            "Select model"
          )}
          <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[calc(100vw-1rem)] max-w-[280px] p-0 shadow-2xl border-border/50" align="start">
        <Command className="rounded-xl overflow-hidden">
          <CommandInput placeholder="Search models..." className="h-9 text-xs" />
          <CommandList className="max-h-[60vh] scrollbar-thin">
            <CommandEmpty className="text-xs py-4">No model found.</CommandEmpty>
            
            {platformModels.length > 0 && (
              <CommandGroup heading="Platform Models" className="px-2">
                {platformModels.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={`${model.name} ${model.summary || ""} ${model.id}`}
                    onSelect={() => handleValueChange(model.id)}
                    className="cursor-pointer py-2.5 px-2 text-xs flex justify-between items-center rounded-lg my-0.5 hover:bg-primary/[0.03]"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="size-8 rounded-lg bg-background border border-border/50 flex items-center justify-center p-1.5 shrink-0">
                        <img
                          src={model.logo || "/icons/ai.svg"}
                          alt={model.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = "/icons/ai.svg";
                          }}
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
                <CommandGroup heading="External Models" className="px-2">
                  {customModels.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={`${model.name} ${model.id}`}
                      onSelect={() => handleValueChange(model.id)}
                      className="cursor-pointer py-2.5 px-2 text-xs flex justify-between items-center rounded-lg my-0.5 hover:bg-emerald-500/[0.03]"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="size-8 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 flex items-center justify-center p-1.5 shrink-0 text-emerald-500 overflow-hidden">
                           {model.logo ? (
                             <img src={model.logo} className="w-full h-full object-contain" />
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
