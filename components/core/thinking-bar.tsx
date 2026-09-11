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

interface ThinkingBarProps {
  text?: string;
  onClick?: () => void;
  isExpanded?: boolean;
  className?: string;
}

export function ThinkingBar({
  text = "Thinking",
  onClick,
  isExpanded = false,
  className,
}: ThinkingBarProps) {
  const rowClass = cn(
    "group flex w-full items-center justify-between gap-3 rounded-md py-2 text-left",
    onClick && "transition-colors hover:bg-muted/40",
    className,
  );

  const label = (
    <span className="flex min-w-0 items-center gap-2">
      <ThinkingBrainIcon
        active={isExpanded || !onClick}
        size="sm"
        className="group-hover:text-foreground/80"
      />
      <span className="text-sm font-medium text-foreground">{text}</span>
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
