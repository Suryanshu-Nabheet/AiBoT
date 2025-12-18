"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChatCircleDots, Columns } from "@phosphor-icons/react";

export type ViewMode = "direct" | "side-by-side";

interface ModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export function ModeToggle({ mode, onChange, className }: ModeToggleProps) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-fit items-center rounded-lg bg-muted/50 p-1 ring-1 ring-border/50",
        className
      )}
    >
      <div className="absolute inset-0 rounded-lg bg-background/50 backdrop-blur-sm" />

      <button
        onClick={() => onChange("direct")}
        className={cn(
          "relative z-10 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          mode === "direct"
            ? "text-primary bg-background shadow-sm ring-1 ring-border/20"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <ChatCircleDots
          weight={mode === "direct" ? "fill" : "regular"}
          className="size-4"
        />
        <span>Direct</span>
        {mode === "direct" && (
          <motion.div
            layoutId="mode-indicator"
            className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm"
            initial={false}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </button>

      <button
        onClick={() => onChange("side-by-side")}
        className={cn(
          "relative z-10 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          mode === "side-by-side"
            ? "text-primary bg-background shadow-sm ring-1 ring-border/20"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <Columns
          weight={mode === "side-by-side" ? "fill" : "regular"}
          className="size-4"
        />
        <span>Arena</span>
        {mode === "side-by-side" && (
          <motion.div
            layoutId="mode-indicator"
            className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm"
            initial={false}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </button>
    </div>
  );
}
