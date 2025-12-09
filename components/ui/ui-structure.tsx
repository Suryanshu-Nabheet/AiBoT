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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useExecutionContext } from "@/contexts/execution-context";
import { Execution } from "@/hooks/useExecution";
import {
  Trash as TrashIcon,
  PencilSimple,
  MagnifyingGlass,
  Code,
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
    <Sidebar className="border-r-2 border-blue-100 bg-blue-50/50">
      <SidebarContent className="w-full">
        <SidebarGroup>
          <SidebarHeader className="border-b border-blue-100 px-2 pb-3">
            <div className="flex w-full flex-col items-center gap-4 rounded-lg p-3">
              <div className="flex w-full items-center justify-center rounded-lg p-2 text-lg">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                  Ai<span className="text-primary">BoT</span>
                </h1>
              </div>
              <div className="relative w-full">
                <MagnifyingGlass className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <SidebarInput
                  placeholder="Search chats..."
                  className="pl-9 h-10 bg-background/50 border-blue-200/50 focus-visible:ring-blue-400/30"
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
                  className="w-full justify-start font-medium shadow-sm hover:bg-white/80 bg-white border-blue-100 h-10 text-base"
                  size="lg"
                  variant="outline"
                >
                  <span className="mr-2 text-primary font-bold">+</span> New
                  Chat
                </Button>

                <Button
                  className="w-full justify-start gap-3 bg-gradient-to-r from-blue-600/5 to-cyan-600/5 hover:from-blue-600/10 hover:to-cyan-600/10 text-blue-700 hover:text-blue-800 border border-blue-200/60 shadow-none h-14 relative overflow-hidden group"
                  variant="outline"
                  onClick={() => toast.info("Agent Mode coming soon!")}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <div className="bg-blue-100/50 p-1.5 rounded-md text-blue-600">
                    <Code className="size-5" weight="duotone" />
                  </div>
                  <div className="flex flex-col items-start text-xs">
                    <span className="font-bold text-sm">Agent Mode</span>
                    <span className="text-[10px] opacity-70 font-medium">
                      Coming Soon
                    </span>
                  </div>
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
                : executions
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
    </Sidebar>
  );
};
