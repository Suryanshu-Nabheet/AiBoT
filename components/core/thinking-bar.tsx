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
  text = "Deep reasoning in progress",
  onClick,
  isExpanded = false,
  className,
}: ThinkingBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center justify-between w-full py-2 group select-none",
        className,
      )}
    >
      <div
        className="flex items-center gap-2.5 cursor-pointer transition-colors hover:text-primary"
        onClick={onClick}
      >
        <ThinkingBrainIcon active className="group-hover:text-primary" />
        <span className="text-sm font-medium text-muted-foreground group-hover:text-primary/90 transition-colors">
          {text}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
        </motion.div>
      </div>
    </motion.div>
  );
}
