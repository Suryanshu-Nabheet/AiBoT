/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type ThinkingModeSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label"?: string;
  className?: string;
};

/** Purple → blue gradient when enabled (Cursor-style mode toggle). */
export function ThinkingModeSwitch({
  checked,
  onCheckedChange,
  "aria-label": ariaLabel,
  className,
}: ThinkingModeSwitchProps) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className={cn(
        "h-[1.125rem] w-8 data-[state=unchecked]:bg-input/90 dark:data-[state=unchecked]:bg-input/70",
        "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-500 data-[state=checked]:via-blue-500 data-[state=checked]:to-indigo-500",
        "data-[state=checked]:shadow-[0_0_12px_-2px_rgba(139,92,246,0.45)]",
        className,
      )}
    />
  );
}

export const thinkingAccentTextClass =
  "bg-gradient-to-r from-violet-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-sky-400 dark:to-indigo-400";
