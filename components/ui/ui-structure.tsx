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
              <div
                className="flex w-full items-center justify-center rounded-lg p-2 text-lg cursor-pointer hover:bg-blue-50/50 transition-colors group"
                onClick={() => router.push("/")}
              >
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight group-hover:scale-105 transition-transform duration-200">
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

                <div className="w-full">
                  <Collapsible
                    open={isAgentModeOpen}
                    onOpenChange={setIsAgentModeOpen}
                    className="w-full"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        className={cn(
                          "w-full justify-between h-11 px-3 bg-background hover:bg-muted border border-input shadow-sm transition-all",
                          isAgentModeOpen &&
                            "bg-muted font-medium text-primary border-primary/20"
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
                      <div className="flex flex-col gap-3 mt-3 px-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-10 bg-white text-blue-600 border border-blue-100 shadow-sm font-medium hover:bg-blue-50/50 hover:border-blue-200 transition-colors duration-200"
                          onClick={() => router.push("/agent/summarizer")}
                        >
                          <FileText className="size-4" weight="regular" />
                          Summarizer
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-10 bg-white text-blue-600 border border-blue-100 shadow-sm font-medium hover:bg-blue-50/50 hover:border-blue-200 transition-colors duration-200"
                          onClick={() => router.push("/agent/coder")}
                        >
                          <TerminalWindow className="size-4" weight="regular" />
                          Coder
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
      <SidebarFooter className="border-t border-blue-100 p-4">
        <div className="w-full text-center">
          <p className="text-[10px] text-blue-400 font-medium">
            Made by <span className="font-bold">Suryanshu Nabheet</span>
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
