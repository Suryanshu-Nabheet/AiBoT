/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { SidebarSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SidebarToggle({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();
  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("nav.toggleSidebar")}
          className={cn(
            "size-9 rounded-lg border border-sidebar-border bg-background p-0 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          onClick={toggleSidebar}
        >
          <SidebarSimple className="size-4" weight="bold" />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="max-w-48 whitespace-normal px-2 py-1 text-center text-[10px] font-bold leading-snug"
      >
        {t("shortcut.toggleSidebar")}
      </TooltipContent>
    </Tooltip>
  );
}
