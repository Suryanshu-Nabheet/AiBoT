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
        "inline-block bg-gradient-to-r from-foreground/10 via-foreground via-50% to-foreground/10 bg-[length:200%_100%] bg-clip-text text-transparent",
        className
      )}
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
