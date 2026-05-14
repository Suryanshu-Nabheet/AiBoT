"use client";

import { motion } from "framer-motion";
import { Brain, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
