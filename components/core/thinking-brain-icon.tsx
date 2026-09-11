/**
 * Shared brain icon for deep-thinking UI (composer + response reasoning bar).
 */

import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

type ThinkingBrainIconProps = {
  active?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function ThinkingBrainIcon({
  active = false,
  size = "sm",
  className,
}: ThinkingBrainIconProps) {
  const box = size === "md" ? "h-7 w-7" : "h-6 w-6";
  const icon = size === "md" ? "h-[18px] w-[18px]" : "h-4 w-4";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md transition-colors",
        box,
        active ? "text-primary" : "text-primary/60 group-hover:text-primary",
        className,
      )}
      aria-hidden
    >
      <Brain className={icon} strokeWidth={2} />
    </span>
  );
}
