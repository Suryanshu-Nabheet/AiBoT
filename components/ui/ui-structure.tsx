"use client";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  Sidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Execution, useExecution } from "@/hooks/useExecution";
import { Trash as TrashIcon, PencilSimple } from "@phosphor-icons/react";
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
  } = useExecution();
  const [hoverChatId, setHoverChatId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const router = useRouter();

  const pathname = usePathname();
  const currentConversationId = pathname?.includes("/ask/")
    ? pathname.split("/ask/")[1]
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
    <Sidebar>
      <SidebarContent className="w-full">
        <SidebarGroup>
          <SidebarHeader className="border-b border-border/40 px-2 pb-3">
            <div className="flex w-full flex-col items-center gap-2 rounded-lg p-3">
              <div className="flex w-full items-center gap-2 rounded-lg p-1 text-lg justify-start">
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Ai<span className="text-primary">BoT</span>
                </h1>
              </div>
              <div className="w-full">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/`);
                    setTimeout(() => {
                      window.location.reload();
                    }, 100);
                  }}
                  className="w-full justify-start font-medium shadow-none hover:bg-muted/80"
                  size="lg"
                  variant="outline"
                >
                  <span className="mr-2">+</span> New Chat
                </Button>
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
                : executions.map((execution: Execution) => (
                    <SidebarMenuItem key={execution.id}>
                      <SidebarMenuButton
                        className={cn(
                          "group relative w-full text-left transition-all duration-200 rounded-lg px-3 py-2 h-auto text-sm",
                          execution.id === currentConversationId
                            ? "bg-accent text-accent-foreground font-medium"
                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        )}
                        onMouseEnter={() => setHoverChatId(execution.id)}
                        onMouseLeave={() => setHoverChatId("")}
                        onClick={() => router.push(`/ask/${execution.id}`)}
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
                                <TrashIcon weight="bold" className="size-3.5" />
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
    </Sidebar>
  );
};
