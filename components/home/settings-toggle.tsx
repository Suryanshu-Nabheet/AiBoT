/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { Gear, ChatCircleDots, Columns, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type ViewMode = "direct" | "side-by-side" | "settings";

interface SettingsToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const DirectLayoutIcon = ({ active }: { active: boolean }) => (
  <div className={cn(
    "w-10 h-8 rounded border transition-colors flex overflow-hidden shadow-sm",
    active ? "border-primary/50 bg-background" : "border-border/50 bg-muted/20"
  )}>
    <div className="w-2.5 border-r border-border/30 flex flex-col gap-0.5 p-0.5">
      <div className="w-full h-0.5 bg-muted-foreground/20 rounded-full" />
      <div className="w-full h-0.5 bg-muted-foreground/20 rounded-full" />
    </div>
    <div className="flex-1 flex flex-col p-1 gap-1">
      <div className="w-full h-0.5 bg-primary/10 rounded-sm" />
      <div className="w-4/5 h-0.5 bg-muted-foreground/10 rounded-sm" />
      <div className="w-full h-0.5 bg-muted-foreground/10 rounded-sm" />
    </div>
  </div>
);

const ArenaLayoutIcon = ({ active }: { active: boolean }) => (
  <div className={cn(
    "w-10 h-8 rounded border transition-colors flex overflow-hidden shadow-sm",
    active ? "border-primary/50 bg-background" : "border-border/50 bg-muted/20"
  )}>
    <div className="w-2 border-r border-border/30 flex flex-col gap-0.5 p-0.5">
      <div className="w-full h-0.5 bg-muted-foreground/20 rounded-full" />
      <div className="w-full h-0.5 bg-muted-foreground/20 rounded-full" />
    </div>
    <div className="flex-1 grid grid-cols-2 gap-0.5 p-0.5">
      <div className="border border-border/20 rounded-sm flex flex-col p-0.5 gap-0.5 bg-primary/[0.03]">
        <div className="w-full h-0.5 bg-primary/20 rounded-full" />
        <div className="w-full h-0.5 bg-muted-foreground/10 rounded-full" />
      </div>
      <div className="border border-border/20 rounded-sm flex flex-col p-0.5 gap-0.5 bg-primary/[0.03]">
        <div className="w-full h-0.5 bg-primary/20 rounded-full" />
        <div className="w-full h-0.5 bg-muted-foreground/10 rounded-full" />
      </div>
    </div>
  </div>
);

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SettingsToggle({ mode, onChange, className }: SettingsToggleProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg bg-background/50 backdrop-blur-md border border-sidebar-border shadow-sm hover:bg-background transition-all duration-200",
                className
              )}
            >
              <Gear className="size-4 text-sidebar-foreground/70" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px] px-2 py-1 font-bold">View Architecture</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-xl border-sidebar-border/50">
        <DropdownMenuLabel className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 py-1.5">
          Architecture
        </DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1.5 p-0.5">
          <button
            onClick={() => onChange("direct")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-2 rounded-lg transition-all duration-300 border",
              mode === "direct" 
                ? "bg-primary/[0.04] text-primary border-primary/20 shadow-sm" 
                : "hover:bg-muted/50 text-muted-foreground border-transparent"
            )}
          >
            <DirectLayoutIcon active={mode === "direct"} />
            <span className="text-[10px] font-bold tracking-tight">Direct Chat</span>
          </button>
          <button
            onClick={() => onChange("side-by-side")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-2 rounded-lg transition-all duration-300 border",
              mode === "side-by-side" 
                ? "bg-primary/[0.04] text-primary border-primary/20 shadow-sm" 
                : "hover:bg-muted/50 text-muted-foreground border-transparent"
            )}
          >
            <ArenaLayoutIcon active={mode === "side-by-side"} />
            <span className="text-[10px] font-bold tracking-tight">Arena Mode</span>
          </button>
        </div>
        <DropdownMenuSeparator className="my-1.5 bg-sidebar-border/50" />
        <DropdownMenuItem 
          onClick={() => onChange("settings")}
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-lg transition-all duration-200 cursor-pointer mx-0.5",
            mode === "settings" 
              ? "bg-primary/[0.04] text-primary" 
              : "hover:bg-muted/50 text-muted-foreground"
          )}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted/50 text-muted-foreground group-hover:text-primary transition-colors">
            <Gear className="size-3.5" weight="bold" />
          </div>
          <span className="text-[11px] font-bold tracking-tight">App Settings</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
