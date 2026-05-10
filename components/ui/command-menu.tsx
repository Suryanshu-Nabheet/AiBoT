/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Chat as ChatIcon,
  Plus as PlusIcon,
  MagnifyingGlass as SearchIcon,
  Clock as ClockIcon,
} from "@phosphor-icons/react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useExecutionContext } from "@/contexts/execution-context";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const { executions } = useExecutionContext();
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return "Today";
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days} days ago`;
      return date.toLocaleDateString();
    } catch (e) {
      return "";
    }
  };

  return (
    <CommandDialog 
        open={open} 
        onOpenChange={setOpen}
        className="max-w-[640px] border-none shadow-2xl bg-background/90 backdrop-blur-xl"
    >
      <CommandInput 
        placeholder="Search threads, commands, or settings..." 
      />
      <CommandList className="max-h-[480px] p-2">
        <CommandEmpty className="py-12 flex flex-col items-center gap-3">
            <SearchIcon className="size-8 text-muted-foreground/20" />
            <p className="text-muted-foreground/60 font-medium">No threads or commands found.</p>
        </CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem
            value="new chat start conversation"
            onSelect={() => runCommand(() => router.push("/"))}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-all">
              <PlusIcon weight="bold" className="h-4 w-4" />
            </div>
            <span className="font-semibold text-foreground">New Chat</span>
            <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">N</span>
            </kbd>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-2" />

        <CommandGroup heading="Recent Threads">
          {executions.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground/50 italic text-center">No recent history available</p>
          ) : (
            executions.slice(0, 10).map((execution) => (
              <CommandItem
                key={execution.id}
                value={`${execution.title} ${execution.id}`}
                onSelect={() => runCommand(() => router.push(`/ask/${execution.id}`))}
                className="group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted group-data-[selected=true]:bg-accent transition-all">
                  <ChatIcon weight="regular" className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate font-medium text-foreground leading-tight">
                    {execution.title || "Untitled Conversation"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                    <ClockIcon className="size-2.5" />
                    {formatDate(execution.createdAt)}
                  </span>
                </div>
              </CommandItem>
            ))
          )}
        </CommandGroup>
      </CommandList>
      
      <div className="flex items-center justify-between border-t border-border/20 bg-muted/20 px-4 py-3 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            <kbd className="flex h-4 min-w-4 items-center justify-center rounded border border-border bg-background px-1 font-sans text-[9px] font-bold shadow-xs">
              ⏎
            </kbd>
            <span>to open</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            <kbd className="flex h-4 min-w-4 items-center justify-center rounded border border-border bg-background px-1 font-sans text-[9px] font-bold shadow-xs">
              ↑↓
            </kbd>
            <span>to navigate</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <kbd className="flex h-4 min-w-4 items-center justify-center rounded border border-border bg-background px-1 font-sans text-[9px] font-bold shadow-xs">
            ESC
          </kbd>
          <span>to close</span>
        </div>
      </div>
    </CommandDialog>
  );
}
