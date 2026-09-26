"use client";

import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function IconTooltip({
  label,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="max-w-48 whitespace-normal px-2 py-1 text-center text-[10px] font-semibold leading-snug"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
