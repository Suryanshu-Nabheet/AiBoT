/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  Sidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExecutionContext } from "@/contexts/execution-context";
import { Execution } from "@/hooks/useExecution";
import {
  Trash as TrashIcon,
  PencilSimple,
  TerminalWindow,
  SpeakerHigh,
  Plus,
  DotsThreeVertical,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import { useViewMode } from "@/contexts/view-mode-context";
import { useTranslation } from "@/hooks/use-translation";

export const UIStructure = () => {
  const { t } = useTranslation();
  const { executions, loading, removeExecution, updateExecution } =
    useExecutionContext();
  const [openChatMenuId, setOpenChatMenuId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [executionToRename, setExecutionToRename] = useState<Execution | null>(
    null,
  );
  const [executionToDelete, setExecutionToDelete] = useState<Execution | null>(
    null,
  );
  const router = useRouter();

  const pathname = usePathname();
  const currentConversationId = pathname?.includes("/chat/")
    ? pathname.split("/chat/")[1]
    : null;

  const handleDeleteExecution = (executionId: string) => {
    removeExecution(executionId);
    if (executionId === currentConversationId) {
      router.push("/");
    }
    toast.success(t("nav.chatDeleted"));
  };

  const handleSaveTitle = () => {
    if (!executionToRename) return;
    const title = editTitle.trim();
    if (!title) return;
    updateExecution(executionToRename.id, { title });
    setExecutionToRename(null);
    toast.success(t("nav.titleUpdated"));
  };

  const confirmDeleteExecution = () => {
    if (!executionToDelete) return;
    handleDeleteExecution(executionToDelete.id);
    setExecutionToDelete(null);
  };

  const { setViewMode } = useViewMode();

  return (
    <Sidebar className="border-r border-sidebar-border/50 bg-sidebar">
      <SidebarContent className="w-full">
        <SidebarGroup className="p-0">
          <SidebarHeader className="border-b border-sidebar-border/50 px-4 pb-4 pt-0">
            <div className="flex w-full flex-col items-center gap-4">
              <div className="relative top-1 flex w-full items-center justify-center">
                <button
                  type="button"
                  aria-label="AiBoT home"
                  className="cursor-pointer"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      sessionStorage.removeItem("session-directModel");
                      sessionStorage.removeItem("session-arena-a");
                      sessionStorage.removeItem("session-arena-b");
                      window.location.href = "/";
                    }
                  }}
                >
                  <h1 className="text-[2rem] font-bold tracking-tight text-foreground">
                    Ai<span className="text-primary">BoT</span>
                  </h1>
                </button>
              </div>
              <div className="flex w-full flex-col gap-1.5">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    if (typeof window !== "undefined") {
                      sessionStorage.removeItem("session-directModel");
                      sessionStorage.removeItem("session-arena-a");
                      sessionStorage.removeItem("session-arena-b");
                      window.location.href = "/";
                    }
                  }}
                  className="h-10 w-full justify-start gap-3 rounded-lg border border-transparent bg-transparent px-3 text-sm font-medium tracking-tight text-sidebar-foreground/90 shadow-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <Plus className="size-4 text-foreground" weight="regular" />
                  </span>
                  {t("nav.newChat")}
                </Button>

                <Button
                  variant="ghost"
                  className={cn(
                    "h-10 w-full justify-start gap-3 rounded-lg border border-transparent bg-transparent px-3 text-sm font-medium tracking-tight text-sidebar-foreground/90 shadow-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    pathname?.startsWith("/agent/coder") &&
                      "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
                  )}
                  onClick={() => router.push("/agent/coder")}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <TerminalWindow className="size-4" weight="regular" />
                  </span>
                  {t("nav.agent.coder")}
                </Button>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-10 w-full justify-start gap-3 rounded-lg border border-transparent bg-transparent px-3 text-sm font-medium tracking-tight text-sidebar-foreground/90 shadow-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    pathname?.startsWith("/agent/voice") &&
                      "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
                  )}
                  onClick={() => router.push("/agent/voice")}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <SpeakerHigh className="size-4" weight="regular" />
                  </span>
                  {t("nav.agent.voice")}
                </Button>
              </div>
            </div>
          </SidebarHeader>
          <SidebarGroupContent className="px-3 pt-2">
            <SidebarGroupLabel className="h-8 px-3 text-xs font-semibold text-sidebar-foreground/70">
              {t("nav.recentChats")}
            </SidebarGroupLabel>
            <SidebarMenu className="w-full gap-1 p-0">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 w-full animate-pulse rounded-lg bg-muted"
                    />
                  ))
                : [...new Map(executions.map((e) => [e.id, e])).values()].map(
                    (execution: Execution) => (
                      <SidebarMenuItem
                        key={execution.id}
                        className="group/chat relative"
                      >
                        <SidebarMenuButton
                          className={cn(
                            "relative h-10 w-full rounded-lg px-3 py-1 pr-10 text-left text-sm transition-colors duration-200",
                            execution.id === currentConversationId ||
                              execution.id === openChatMenuId
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                              : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground",
                          )}
                          onClick={() => {
                            if (execution.mode) {
                              setViewMode(execution.mode);
                            }
                            router.push(`/chat/${execution.id}`);
                          }}
                        >
                          <span className="w-full truncate">
                            {execution.title}
                          </span>
                        </SidebarMenuButton>
                        <DropdownMenu
                          open={openChatMenuId === execution.id}
                          onOpenChange={(open) =>
                            setOpenChatMenuId(open ? execution.id : null)
                          }
                        >
                          <IconTooltip
                            label={t("nav.chatOptions")}
                            side="right"
                            align="center"
                          >
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("nav.chatOptions")}
                                className={cn(
                                  "absolute right-1 top-1/2 z-10 size-8 -translate-y-1/2 rounded-md bg-sidebar text-sidebar-foreground/70 shadow-none transition-opacity hover:bg-sidebar-accent hover:text-sidebar-foreground group-hover/chat:opacity-100 group-focus-within/chat:opacity-100 focus-visible:opacity-100",
                                  openChatMenuId === execution.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              >
                                <DotsThreeVertical
                                  className="size-4"
                                  weight="bold"
                                />
                              </Button>
                            </DropdownMenuTrigger>
                          </IconTooltip>
                          <DropdownMenuContent
                            side="bottom"
                            align="start"
                            sideOffset={4}
                            className="w-56"
                          >
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditTitle(execution.title);
                                setExecutionToRename(execution);
                              }}
                            >
                              <PencilSimple weight="regular" />
                              {t("nav.editChat")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setExecutionToDelete(execution)}
                            >
                              <TrashIcon weight="regular" />
                              {t("nav.deleteChat")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    ),
                  )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <div className="w-full text-center">
          <p className="text-[11px] text-sidebar-foreground/40 font-medium">
            {t("nav.madeBy").includes("Suryanshu Nabheet") ? (
              <>
                {t("nav.madeBy").split("Suryanshu Nabheet")[0]}
                <a
                  href="https://github.com/Suryanshu-Nabheet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:underline transition-all"
                >
                  Suryanshu Nabheet
                </a>
                {t("nav.madeBy").split("Suryanshu Nabheet")[1] || ""}
              </>
            ) : (
              t("nav.madeBy")
            )}
          </p>
        </div>
      </SidebarFooter>
      <Dialog
        open={executionToRename !== null}
        onOpenChange={(open) => {
          if (!open) setExecutionToRename(null);
        }}
      >
        <DialogContent className="max-w-md gap-5 border-border/80 bg-popover p-6">
          <DialogHeader className="gap-2 text-left">
            <DialogTitle className="text-xl">{t("nav.editChat")}</DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              {t("nav.renameDialogDescription", {
                chatTitle: executionToRename?.title ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <input
            autoFocus
            type="text"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && editTitle.trim()) {
                event.preventDefault();
                handleSaveTitle();
              }
            }}
            aria-label={t("nav.editChat")}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <DialogFooter className="flex-row justify-end gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExecutionToRename(null)}
            >
              {t("nav.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSaveTitle}
              disabled={!editTitle.trim()}
            >
              {t("nav.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={executionToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setExecutionToDelete(null);
        }}
      >
        <DialogContent className="max-w-md gap-5 border-border/80 bg-popover p-6">
          <DialogHeader className="gap-2 text-left">
            <DialogTitle className="text-xl">
              {t("nav.confirmDeleteTitle")}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              {t("nav.confirmDeleteDescription", {
                chatTitle: executionToDelete?.title ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExecutionToDelete(null)}
            >
              {t("nav.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteExecution}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("nav.deleteChat")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
};
