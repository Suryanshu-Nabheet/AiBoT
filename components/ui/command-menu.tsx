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

  return (
    <CommandDialog 
        open={open} 
        onOpenChange={setOpen}
        className="max-w-[600px] border-none shadow-2xl bg-background/80 backdrop-blur-xl"
    >
      <CommandInput 
        placeholder="Type a command or search your threads..." 
      />
      <CommandList className="max-h-[450px]">
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/"))}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PlusIcon weight="bold" className="h-4 w-4" />
            </div>
            <span className="font-semibold text-foreground">New Chat</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Recent Threads">
          {executions.slice(0, 10).map((execution) => (
            <CommandItem
              key={execution.id}
              onSelect={() => runCommand(() => router.push(`/ask/${execution.id}`))}
            >
              <ChatIcon weight="regular" className="h-5 w-5" />
              <span className="truncate">{execution.title || "Untitled Chat"}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      
      <div className="flex items-center justify-between border-t border-border/40 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <kbd className="flex h-5 items-center justify-center rounded border border-border bg-background px-1.5 font-sans font-medium shadow-xs">
            <span className="text-[10px]">⏎</span>
          </kbd>
          <span>Type something to search or start a new chat</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <kbd className="flex h-5 items-center justify-center rounded border border-border bg-background px-1.5 font-sans font-medium shadow-xs">
            <span className="text-[10px]">ESC</span>
          </kbd>
          <span>to close</span>
        </div>
      </div>
    </CommandDialog>
  );
}
