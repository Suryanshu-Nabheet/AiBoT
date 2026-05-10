/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, CaretDown, Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import ShinyText from "@/components/ui/shiny-text";

interface ThinkingBarProps {
  text: string;
  stopLabel?: string;
  onStop?: () => void;
  onClick?: () => void;
  className?: string;
}

export function ThinkingBar({
  text,
  stopLabel = "Skip thinking",
  onStop,
  onClick,
  className,
}: ThinkingBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-muted/40 backdrop-blur-md border border-border/50 shadow-lg cursor-pointer hover:bg-muted/60 transition-all duration-300",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="relative flex items-center justify-center size-5 shrink-0">
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 flex items-center justify-center opacity-30"
            >
                <Sparkle weight="fill" className="size-4 text-primary" />
            </motion.div>
            <Sparkle weight="bold" className="size-3 text-primary animate-pulse" />
        </div>
        
        <ShinyText 
          text={text} 
          speed={3}
          className="mt-0 mb-0 pl-0 min-h-0 text-[13px] font-medium tracking-tight truncate flex-1" 
        />
        
        <CaretDown 
            className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" 
            weight="bold"
        />
      </div>

      {onStop && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStop();
          }}
          className="flex items-center gap-1.5 pl-3 border-l border-border/50 text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors group/stop"
        >
          <span>{stopLabel}</span>
          <XCircle weight="fill" className="size-3.5 opacity-50 group-hover/stop:opacity-100" />
        </button>
      )}
    </motion.div>
  );
}

export function ThinkingBarInteractive() {
  return (
    <div className="p-8 flex justify-center">
      <ThinkingBar
        text="Deep reasoning in progress"
        stopLabel="Skip thinking"
        onStop={() => console.log("Skip thinking")}
        onClick={() => console.log("Expand reasoning details")}
      />
    </div>
  );
}
