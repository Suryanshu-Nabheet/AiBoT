/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

type ThinkingBrainIconProps = {
  /** Slightly stronger stroke while streaming / expanded */
  active?: boolean;
  size?: "xs" | "sm";
  className?: string;
};

/**
 * Compact brain icon for thinking states (message bar, loaders).
 * Neutral tones — no primary accent.
 */
export function ThinkingBrainIcon({
  active = false,
  size = "sm",
  className,
}: ThinkingBrainIconProps) {
  const iconClass = size === "xs" ? "size-3" : "size-3.5";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-muted-foreground transition-colors",
        active && "text-foreground",
        className,
      )}
      aria-hidden
    >
      <Brain className={iconClass} strokeWidth={active ? 2 : 1.75} />
    </span>
  );
}
