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
          color: "#b5b5b5",
          background: "linear-gradient(90deg, #b5b5b5 0%, #b5b5b5 40%, rgba(255, 255, 255, 0.4) 50%, #b5b5b5 60%, #b5b5b5 100%)",
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
