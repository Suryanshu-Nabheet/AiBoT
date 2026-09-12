/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Columns2, MessageSquare, Moon, Plus, Sun } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useExecutionContext } from "@/contexts/execution-context";
import { useViewMode } from "@/contexts/view-mode-context";
import { useTranslation } from "@/hooks/use-translation";
import type { ViewMode } from "@/components/home/settings-toggle";

const HISTORY_LIMIT = 20;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [modKey, setModKey] = useState("⌘");
  const router = useRouter();
  const { t } = useTranslation();
  const { executions } = useExecutionContext();
  const { viewMode, setViewMode } = useViewMode();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const isApple =
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
    setModKey(isApple ? "⌘" : "Ctrl");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;
      if (!(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setOpen((prev) => !prev);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const recentChats = useMemo(() => {
    const unique = [...new Map(executions.map((e) => [e.id, e])).values()];
    return unique.slice(0, HISTORY_LIMIT);
  }, [executions]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const switchLayout = (mode: ViewMode) => {
    run(() => {
      if (
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/chat/")
      ) {
        setViewMode(mode);
        router.push("/");
        return;
      }
      setViewMode(mode);
    });
  };

  const openChat = (id: string, mode?: "direct" | "side-by-side") => {
    run(() => {
      if (mode) setViewMode(mode);
      router.push(`/chat/${id}`);
    });
  };

  const startNewChat = () => {
    run(() => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("session-directModel");
        sessionStorage.removeItem("session-arena-a");
        sessionStorage.removeItem("session-arena-b");
      }
      router.push("/");
    });
  };

  const toggleTheme = () => {
    run(() => {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    });
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("command.title")}
      description={t("command.description")}
    >
      <Command className="**:data-[selected=true]:bg-muted **:data-selected:bg-transparent [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-item]]:px-2 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
        <CommandInput placeholder={t("command.placeholder")} />
        <CommandList>
          <CommandEmpty>{t("command.empty")}</CommandEmpty>

          <CommandGroup heading={t("command.group.actions")}>
            <CommandItem onSelect={startNewChat}>
              <Plus />
              <span>{t("command.newChat")}</span>
              <CommandShortcut>{modKey}N</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={t("command.group.navigate")}>
            <CommandItem
              onSelect={() => switchLayout("direct")}
              disabled={viewMode === "direct"}
            >
              <MessageSquare />
              <span>{t("command.layout.direct")}</span>
              <CommandShortcut>{modKey}1</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => switchLayout("side-by-side")}
              disabled={viewMode === "side-by-side"}
            >
              <Columns2 />
              <span>{t("command.layout.arena")}</span>
              <CommandShortcut>{modKey}2</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={t("command.group.system")}>
            <CommandItem onSelect={toggleTheme}>
              {resolvedTheme === "dark" ? <Sun /> : <Moon />}
              <span>
                {resolvedTheme === "dark"
                  ? t("command.theme.light")
                  : t("command.theme.dark")}
              </span>
              <CommandShortcut>{modKey}⇧D</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          {recentChats.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t("command.group.history")}>
                {recentChats.map((chat) => (
                  <CommandItem
                    key={chat.id}
                    value={`${chat.title} ${chat.id}`}
                    onSelect={() => openChat(chat.id, chat.mode)}
                  >
                    <MessageSquare />
                    <span className="truncate">{chat.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>

        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t px-3 py-2 text-[10px] tracking-wide">
          <span>{t("command.footer.hint")}</span>
          <span className="font-medium">
            {modKey}K · {modKey}B · {modKey}/
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
