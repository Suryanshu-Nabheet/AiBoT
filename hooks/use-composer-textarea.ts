"use client";

import { useEffect, type RefObject } from "react";

const COMPACT_MAX_HEIGHT_RATIO = 0.3;
const COMPACT_MAX_HEIGHT_PX = 160;
const DEFAULT_MAX_HEIGHT_RATIO = 0.35;
const DEFAULT_MAX_HEIGHT_PX = 240;

export function useComposerTextarea(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  value: string,
  enabled = true,
  variant: "compact" | "default" = "default",
) {
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!enabled || !textarea) return;

    const maxRatio =
      variant === "compact"
        ? COMPACT_MAX_HEIGHT_RATIO
        : DEFAULT_MAX_HEIGHT_RATIO;
    const maxPx =
      variant === "compact" ? COMPACT_MAX_HEIGHT_PX : DEFAULT_MAX_HEIGHT_PX;
    const maxHeight = Math.min(window.innerHeight * maxRatio, maxPx);

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [enabled, textareaRef, value, variant]);
}
