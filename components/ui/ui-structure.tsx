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
  SidebarInput,
  SidebarSeparator,
  Sidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useExecutionContext } from "@/contexts/execution-context";
import { Execution } from "@/hooks/useExecution";
import {
  Trash as TrashIcon,
  PencilSimple,
  MagnifyingGlass,
  Code,
  FileText,
  TerminalWindow,
  CaretDown,
  SpeakerHigh,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";

export const UIStructure = () => {
  const {
    executions,
    loading,
    refreshExecutions,
    removeExecution,
    updateExecution,
  } = useExecutionContext();
  const [hoverChatId, setHoverChatId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
    toast.success("Chat deleted");
  };

  const handleSaveTitle = (id: string) => {
    updateExecution(id, { title: editTitle });
    setEditingId("");
    toast.success("Title updated");
  };

  return (
    <Sidebar className="border-r border-sidebar-border/50 bg-sidebar">
      <SidebarContent className="w-full">
        <SidebarGroup>
          <SidebarHeader className="border-b border-sidebar-border/50 px-2 pb-3">
            <div className="flex w-full flex-col items-center gap-4 rounded-xl p-2">
              <div
                className="flex w-full items-center justify-center rounded-xl p-2.5 text-lg cursor-pointer bg-background/40 border border-sidebar-border/50 hover:bg-background/60 hover:border-sidebar-border transition-all duration-300 group shadow-sm hover:shadow-md"
                onClick={() => router.push("/")}
              >
                <h1 className="text-3xl font-black text-foreground tracking-tighter group-hover:scale-105 transition-transform duration-300">
                  Ai<span className="text-primary">BoT</span>
                </h1>
              </div>
              <div className="relative w-full">
                <MagnifyingGlass className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <SidebarInput
                  placeholder="Search chats..."
                  className="pl-9 h-10 bg-background/50 border-sidebar-border/50 focus-visible:ring-sidebar-ring/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full flex flex-col gap-2">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/`);
                    setTimeout(() => {
                      window.location.reload();
                    }, 100);
                  }}
                  className="w-full justify-start font-semibold shadow-sm hover:bg-sidebar-accent bg-background border-sidebar-border/50 h-10 text-sm text-foreground transition-all duration-200"
                  size="lg"
                  variant="outline"
                >
                  <span className="mr-2 text-primary font-bold">+</span> New
                  Chat
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
                          "w-full justify-between h-11 px-3 bg-background hover:bg-sidebar-accent border border-sidebar-border/50 shadow-sm transition-all text-foreground",
                          isAgentModeOpen &&
                            "bg-sidebar-accent font-semibold text-primary border-sidebar-border"
                        )}
                        variant="outline"
                      >
                        <div className="flex items-center gap-2.5">
                          <Code
                            className={cn(
                              "size-4",
                              isAgentModeOpen
                                ? "text-primary"
                                : "text-muted-foreground"
                            )}
                            weight={isAgentModeOpen ? "bold" : "regular"}
                          />
                          <span className="text-sm">Agent Mode</span>
                        </div>
                        <CaretDown
                          className={cn(
                            "size-3.5 text-muted-foreground transition-transform duration-200",
                            isAgentModeOpen && "rotate-180 text-primary"
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex flex-col gap-2 mt-3 px-1">
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-11 bg-background/50 text-foreground border border-sidebar-border/80 shadow-sm font-semibold hover:bg-sidebar-accent hover:border-sidebar-border transition-all duration-200"
                          onClick={() => router.push("/agent/summarizer")}
                        >
                          <FileText className="size-4.5 text-primary" weight="bold" />
                          Summarizer
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-11 bg-background/50 text-foreground border border-sidebar-border/80 shadow-sm font-semibold hover:bg-sidebar-accent hover:border-sidebar-border transition-all duration-200"
                          onClick={() => router.push("/agent/coder")}
                        >
                          <TerminalWindow className="size-4.5 text-primary" weight="bold" />
                          Coder
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-11 bg-background/50 text-foreground border border-sidebar-border/80 shadow-sm font-semibold hover:bg-sidebar-accent hover:border-sidebar-border transition-all duration-200"
                          onClick={() => router.push("/agent/coach")}
                        >
                          <SpeakerHigh className="size-4.5 text-primary" weight="bold" />
                          Coach
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
                : [...new Map(executions.map((e) => [e.id, e])).values()]
                    .filter((execution) =>
                      execution.title
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    )
                    .map((execution: Execution) => (
                      <SidebarMenuItem key={execution.id}>
                        <SidebarMenuButton
                          className={cn(
                            "group relative w-full text-left transition-all duration-200 rounded-lg px-3 py-2 h-auto text-sm",
                            execution.id === currentConversationId
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                              : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                          )}
                          onMouseEnter={() => setHoverChatId(execution.id)}
                          onMouseLeave={() => setHoverChatId("")}
                          onClick={() => router.push(`/chat/${execution.id}`)}
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
                                  <div
                                    className="flex items-center justify-center rounded-md p-1 hover:bg-muted transition-colors cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingId(execution.id);
                                      setEditTitle(execution.title);
                                    }}
                                  >
                                    <PencilSimple
                                      weight="bold"
                                      className="size-3.5"
                                    />
                                  </div>
                                )}
                                <div
                                  className="flex items-center justify-center rounded-md p-1 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteExecution(execution.id);
                                  }}
                                >
                                  <TrashIcon
                                    weight="bold"
                                    className="size-3.5"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <div className="w-full text-center">
          <p className="text-[11px] text-sidebar-foreground/40 font-medium">
            Made by{" "}
            <a
              href="https://github.com/Suryanshu-Nabheet"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:underline transition-all"
            >
              Suryanshu Nabheet
            </a>
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
