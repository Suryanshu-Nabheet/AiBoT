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
      <SelectTrigger className="bg-background max-h-9 w-[350px] border-input focus:ring-primary/20">
        <SelectValue placeholder="Select Model">
          {selectedModelObj && (
            <div className="flex items-center gap-2 font-medium truncate">
              <span>{selectedModelObj.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {MODELS.map((model) => (
          <SelectItem
            key={model.id}
            value={model.id}
            className="cursor-pointer py-3"
          >
            <div className="flex flex-col gap-1 w-full max-w-[400px]">
              <span className="font-medium text-sm">{model.name}</span>
              {model.summary && (
                <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed whitespace-normal text-wrap">
                  {model.summary}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
