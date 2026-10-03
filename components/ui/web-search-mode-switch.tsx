"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type WebSearchModeSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label"?: string;
  className?: string;
};

export function WebSearchModeSwitch({
  checked,
  onCheckedChange,
  "aria-label": ariaLabel,
  className,
}: WebSearchModeSwitchProps) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className={cn(
        "h-[1.125rem] w-8 data-[state=unchecked]:bg-input/90 dark:data-[state=unchecked]:bg-input/70",
        "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-500 data-[state=checked]:via-teal-500 data-[state=checked]:to-cyan-500",
        "data-[state=checked]:shadow-[0_0_12px_-2px_rgba(16,185,129,0.45)]",
        className,
      )}
    />
  );
}

export const webSearchAccentTextClass =
  "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400";
