"use client";

import { motion } from "framer-motion";
import { StopCircle, Brain, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingBarProps {
  text?: string;
  stopLabel?: string;
  onStop?: () => void;
  onClick?: () => void;
  isExpanded?: boolean;
  className?: string;
}

export function ThinkingBar({
  text = "Deep reasoning in progress",
  stopLabel = "Skip thinking",
  onStop,
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
        className
      )}
    >
      <div 
        className="flex items-center gap-2.5 cursor-pointer transition-colors hover:text-primary"
        onClick={onClick}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md text-primary/70 group-hover:text-primary transition-colors">
          <Brain className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-muted-foreground group-hover:text-primary/90 transition-colors">
          {text}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-300", isExpanded && "rotate-180")} />
      </div>

      {onStop && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStop();
          }}
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-primary transition-colors"
        >
          <StopCircle className="h-3 w-3" />
          {stopLabel}
        </button>
      )}
    </motion.div>
  );
}
