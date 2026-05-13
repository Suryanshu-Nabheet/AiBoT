/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { SidebarSimple } from "@phosphor-icons/react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SidebarToggle({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "p-2 rounded-lg bg-background border border-sidebar-border text-sidebar-foreground/80 cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200 shadow-sm hover:shadow-md ring-1 ring-black/5",
            className
          )}
          onClick={toggleSidebar}
        >
          <SidebarSimple className="size-4" weight="bold" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-[10px] px-2 py-1 font-bold">Toggle Sidebar</TooltipContent>
    </Tooltip>
  );
}
