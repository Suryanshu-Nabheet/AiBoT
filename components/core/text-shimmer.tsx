/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextShimmerProps {
  children: string;
  className?: string;
  duration?: number;
}

export function TextShimmer({
  children,
  className,
  duration = 2,
}: TextShimmerProps) {
  return (
    <motion.span
      className={cn(
        "inline-block bg-[length:200%_100%] bg-clip-text text-transparent",
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(90deg, color-mix(in srgb, var(--muted-foreground) 35%, transparent) 0%, var(--muted-foreground) 48%, var(--muted-foreground) 52%, color-mix(in srgb, var(--muted-foreground) 35%, transparent) 100%)",
      }}
      animate={{
        backgroundPosition: ["100% center", "-100% center"],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {children}
    </motion.span>
  );
}
