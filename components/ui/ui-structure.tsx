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
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  Sidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { useExecutionContext } from "@/contexts/execution-context";
import { Execution } from "@/hooks/useExecution";
import {
  Trash as TrashIcon,
  PencilSimple,
  Code,
  FileText,
  TerminalWindow,
  CaretDown,
  SpeakerHigh,
  Plus,
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
  const [hoverChatId, setHoverChatId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [isAgentModeOpen, setIsAgentModeOpen] = useState(false);

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

  const handleSaveTitle = (id: string) => {
    updateExecution(id, { title: editTitle });
    setEditingId("");
    toast.success(t("nav.titleUpdated"));
  };

  const { setViewMode } = useViewMode();

  return (
    <Sidebar className="border-r border-sidebar-border/50 bg-sidebar">
      <SidebarContent className="w-full">
        <SidebarGroup className="p-0">
          <SidebarHeader className="border-b border-sidebar-border/50 px-4 pb-4 pt-0">
            <div className="flex w-full flex-col items-center gap-5">
              <div className="relative top-2 flex w-full items-center justify-center">
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
              <div className="w-full flex flex-col gap-3">
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
                  className="mx-auto h-10 w-[calc(100%-0.5rem)] justify-start gap-3 rounded-lg border border-transparent bg-transparent px-3 font-medium tracking-tight text-foreground shadow-none transition-colors hover:bg-sidebar-accent hover:text-foreground"
                >
                  <Plus className="size-4 text-foreground" weight="regular" />
                  {t("nav.newChat")}
                </Button>

                <div className="w-full">
                  <Collapsible
                    open={isAgentModeOpen}
                    onOpenChange={setIsAgentModeOpen}
                    className="w-full"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        className={cn(
                          "mx-auto h-10 w-[calc(100%-0.5rem)] justify-between rounded-lg border border-transparent bg-transparent px-3 text-foreground shadow-none transition-colors hover:bg-sidebar-accent hover:text-foreground",
                          isAgentModeOpen &&
                            "border-sidebar-border/50 bg-sidebar-accent/80 font-medium text-foreground",
                        )}
                        variant="ghost"
                      >
                        <div className="flex items-center gap-2.5">
                          <Code
                            className={cn(
                              "size-5 text-foreground transition-colors",
                              isAgentModeOpen
                                ? "text-primary"
                                : "text-foreground",
                            )}
                            weight="bold"
                          />
                          <span className="font-medium tracking-tight text-foreground">
                            {t("nav.agentMode")}
                          </span>
                        </div>
                        <CaretDown
                          className={cn(
                            "size-3.5 text-foreground/80 transition-transform duration-300",
                            isAgentModeOpen ? "rotate-180 text-foreground" : "",
                          )}
                          weight="bold"
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex flex-col gap-2 mt-3 px-1">
                        <Button
                          variant="ghost"
                          className={cn(
                            "mx-auto h-9 w-[calc(100%-0.5rem)] justify-start gap-3 rounded-lg border border-transparent bg-transparent px-3 font-normal tracking-tight text-foreground/90 shadow-none transition-colors hover:bg-sidebar-accent hover:text-foreground",
                            pathname?.startsWith("/agent/summarizer") &&
                              "border-sidebar-border/50 bg-sidebar-accent font-medium text-foreground",
                          )}
                          onClick={() => router.push("/agent/summarizer")}
                        >
                          <FileText
                            className="size-4 text-foreground"
                            weight="regular"
                          />
                          {t("nav.agent.summarizer")}
                        </Button>
                        <Button
                          variant="ghost"
                          className={cn(
                            "mx-auto h-9 w-[calc(100%-0.5rem)] justify-start gap-3 rounded-lg border border-transparent bg-transparent px-3 font-normal tracking-tight text-foreground/90 shadow-none transition-colors hover:bg-sidebar-accent hover:text-foreground",
                            pathname?.startsWith("/agent/coder") &&
                              "border-sidebar-border/50 bg-sidebar-accent font-medium text-foreground",
                          )}
                          onClick={() => router.push("/agent/coder")}
                        >
                          <TerminalWindow
                            className="size-4 text-foreground"
                            weight="regular"
                          />
                          {t("nav.agent.coder")}
                        </Button>
                        <Button
                          variant="ghost"
                          className={cn(
                            "mx-auto h-9 w-[calc(100%-0.5rem)] justify-start gap-3 rounded-lg border border-transparent bg-transparent px-3 font-normal tracking-tight text-foreground/90 shadow-none transition-colors hover:bg-sidebar-accent hover:text-foreground",
                            pathname?.startsWith("/agent/coach") &&
                              "border-sidebar-border/50 bg-sidebar-accent font-medium text-foreground",
                          )}
                          onClick={() => router.push("/agent/coach")}
                        >
                          <SpeakerHigh
                            className="size-4 text-foreground"
                            weight="regular"
                          />
                          {t("nav.agent.coach")}
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </div>
          </SidebarHeader>
          <SidebarGroupContent className="px-3">
            <SidebarMenu className="w-full p-0 gap-1">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-muted h-9 w-full animate-pulse rounded-md"
                    />
                  ))
                : [...new Map(executions.map((e) => [e.id, e])).values()].map(
                    (execution: Execution) => (
                      <SidebarMenuItem key={execution.id}>
                        <SidebarMenuButton
                          className={cn(
                            "group relative w-full text-left transition-all duration-200 rounded-lg px-3 py-2 h-auto text-sm",
                            execution.id === currentConversationId
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                              : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground",
                          )}
                          onMouseEnter={() => setHoverChatId(execution.id)}
                          onMouseLeave={() => setHoverChatId("")}
                          onClick={() => {
                            if (execution.mode) {
                              setViewMode(execution.mode);
                            }
                            router.push(`/chat/${execution.id}`);
                          }}
                        >
                          <div className="flex w-full items-center justify-between overflow-hidden">
                            {editingId === execution.id ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => handleSaveTitle(execution.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveTitle(execution.id);
                                  } else if (e.key === "Escape") {
                                    setEditingId("");
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="flex-1 bg-transparent border-b border-primary outline-none pr-6"
                              />
                            ) : (
                              <span
                                className="truncate w-full pr-12"
                                title={execution.title}
                              >
                                {execution.title}
                              </span>
                            )}

                            {(execution.id === hoverChatId ||
                              execution.id === currentConversationId) && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {editingId !== execution.id && (
                                  <IconTooltip
                                    label={t("nav.editChat")}
                                    side="top"
                                    align="end"
                                  >
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      aria-label={t("nav.editChat")}
                                      className="flex cursor-pointer items-center justify-center rounded-md p-1 transition-colors hover:bg-muted"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingId(execution.id);
                                        setEditTitle(execution.title);
                                      }}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" ||
                                          e.key === " "
                                        ) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setEditingId(execution.id);
                                          setEditTitle(execution.title);
                                        }
                                      }}
                                    >
                                      <PencilSimple
                                        weight="bold"
                                        className="size-3.5"
                                      />
                                    </div>
                                  </IconTooltip>
                                )}
                                <IconTooltip
                                  label={t("nav.deleteChat")}
                                  side="top"
                                  align="start"
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    aria-label={t("nav.deleteChat")}
                                    className="flex cursor-pointer items-center justify-center rounded-md p-1 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteExecution(execution.id);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteExecution(execution.id);
                                      }
                                    }}
                                  >
                                    <TrashIcon
                                      weight="bold"
                                      className="size-3.5"
                                    />
                                  </div>
                                </IconTooltip>
                              </div>
                            )}
                          </div>
                        </SidebarMenuButton>
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
    </Sidebar>
  );
};
