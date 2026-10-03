"use client";

import { ModelSelector } from "@/components/ui/model-selector";

interface ComposerModelSlotProps {
  visible: boolean;
  model: string;
  onModelChange: (model: string) => void;
  modelStorageKey?: string;
  isThinking: boolean;
  onThinkingChange?: (enabled: boolean) => void;
  webSearchEnabled?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  showModelSelector: boolean;
  triggerClassName?: string;
}

export function ComposerModelSlot({
  visible,
  model,
  onModelChange,
  modelStorageKey,
  isThinking,
  onThinkingChange,
  webSearchEnabled,
  onWebSearchChange,
  showModelSelector,
  triggerClassName = "h-8 sm:h-9",
}: ComposerModelSlotProps) {
  if (!visible) return null;

  return (
    <ModelSelector
      value={model}
      onValueChange={onModelChange}
      modelStorageKey={modelStorageKey}
      thinkingEnabled={isThinking}
      onThinkingChange={onThinkingChange}
      webSearchEnabled={webSearchEnabled}
      onWebSearchChange={onWebSearchChange}
      showModelList={showModelSelector}
      triggerVariant="compact"
      iconOnlyOnMobile
      enablePickerShortcut
      triggerClassName={triggerClassName}
    />
  );
}
