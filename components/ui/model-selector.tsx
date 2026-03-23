"use client";

import { useEffect, useState } from "react";
import { MODELS } from "@/lib/types";
import { useModel } from "@/hooks/use-model";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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
  const { modelId: persistedModelId, setModelId } = useModel({
    initialModel: value ?? MODELS[0].id,
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

  const selectedModelObj = MODELS.find((m) => m.id === selectedModel);

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
      <DropdownMenuContent className="w-[calc(100vw-1rem)] max-w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models..." className="h-8 text-xs" />
          <CommandList className="max-h-[50vh]">
            <CommandEmpty className="text-xs py-4">No model found.</CommandEmpty>
            <CommandGroup>
              {MODELS.map((model) => (
                <CommandItem
                  key={model.id}
                  value={`${model.name} ${model.summary || ""} ${model.id}`}
                  onSelect={() => handleValueChange(model.id)}
                  className="cursor-pointer py-2 text-xs flex justify-between items-center border-none"
                >
                  <div className="flex items-center gap-2 w-full">
                    <img
                      src={model.logo || "/icons/ai.svg"}
                      alt={model.name}
                      className="size-4 object-contain shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = "/icons/ai.svg";
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-foreground">
                        {model.name}
                      </span>
                      {model.summary && (
                        <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
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
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
