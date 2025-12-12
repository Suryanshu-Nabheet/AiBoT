"use client";

import { useEffect } from "react";
import { MODELS } from "@/lib/types";
import { useModel } from "@/hooks/use-model";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  const selectedModelObj = MODELS.find((m) => m.id === selectedModel);

  return (
    <Select
      value={selectedModel}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 w-fit border-none bg-muted/50 px-2 font-medium text-muted-foreground text-xs hover:bg-muted hover:text-foreground focus:ring-0">
        <SelectValue placeholder="Select model">
          {selectedModelObj && (
            <div className="flex items-center gap-2">
              <img
                src={selectedModelObj.logo || "/icons/ai.svg"}
                alt={selectedModelObj.name}
                className="size-4 object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/icons/ai.svg";
                }}
              />
              <span className="truncate max-w-[160px]">
                {selectedModelObj.name}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="w-[280px]">
        {MODELS.map((model) => (
          <SelectItem
            key={model.id}
            value={model.id}
            className="cursor-pointer py-3 text-xs"
          >
            <div className="flex items-start gap-2 w-full">
              <img
                src={model.logo || "/icons/ai.svg"}
                alt={model.name}
                className="size-5 object-contain shrink-0 mt-0.5"
                onError={(e) => {
                  e.currentTarget.src = "/icons/ai.svg";
                }}
              />
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="font-medium text-sm truncate">
                  {model.name}
                </span>
                {model.summary && (
                  <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {model.summary}
                  </span>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
