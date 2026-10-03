/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThinkingBrainIcon } from "@/components/core/thinking-brain-icon";
import { TextShimmer } from "@/components/core/text-shimmer";

interface ThinkingBarProps {
  text?: string;
  onClick?: () => void;
  isExpanded?: boolean;
  /** Shimmer label while the model is still in the thinking phase. */
  shimmerLabel?: boolean;
  className?: string;
}

export function ThinkingBar({
  text = "Thinking",
  onClick,
  isExpanded = false,
  shimmerLabel = false,
  className,
}: ThinkingBarProps) {
  const rowClass = cn(
    "group flex w-full items-center justify-between gap-3 rounded-md py-2 text-left",
    onClick && "transition-colors hover:bg-muted/40",
    className,
  );

  const labelText = shimmerLabel ? (
    <TextShimmer className="text-sm font-medium" duration={1.2}>
      {text}
    </TextShimmer>
  ) : (
    <span className="text-sm font-medium text-foreground">{text}</span>
  );

  const label = (
    <span className="flex min-w-0 items-center gap-2">
      <ThinkingBrainIcon
        active={shimmerLabel || isExpanded || !onClick}
        size="sm"
        className="group-hover:text-foreground/80"
      />
      {labelText}
    </span>
  );

  if (!onClick) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={rowClass}
      >
        {label}
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className={rowClass}
    >
      {label}
      <motion.span
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="shrink-0 text-muted-foreground/70"
      >
        <ChevronDown className="h-4 w-4" aria-hidden />
      </motion.span>
    </motion.button>
  );
}
