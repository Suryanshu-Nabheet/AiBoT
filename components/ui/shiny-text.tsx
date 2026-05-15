/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import React from "react";
import { cn } from "@/lib/utils";

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 3,
  className,
}) => {
  return (
    <div className={cn("flex items-center mt-1.5 mb-0.5 pl-0.5 min-h-[20px]", className)}>
      <span
        className={cn(
          "font-medium text-[13px] inline-block tracking-[0.1px] font-inherit opacity-80",
          !disabled && "animate-shiny-text"
        )}
        style={{
          color: "#2563eb",
          background: "linear-gradient(90deg, #2563eb 0%, #2563eb 40%, #93c5fd 50%, #2563eb 60%, #2563eb 100%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animationDuration: `${speed}s`,
          animationIterationCount: "infinite",
          animationTimingFunction: "linear",
        }}
      >
        {text}
      </span>
    </div>
  );
};

export default ShinyText;
