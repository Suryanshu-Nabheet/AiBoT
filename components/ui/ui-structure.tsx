"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "./button";
import { useState, useEffect } from "react";
import { TrashIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import { useExecutionContext } from "@/contexts/execution-context";
import { Execution } from "@/hooks/useExecution";
import { cn } from "@/lib/utils";

export function UIStructure() {
  const [uiExecutions, setUiExecutions] = useState<Execution[]>([]);
  const [hoverChatId, setHoverChatId] = useState<string>("");
  const { executions, loading, refreshExecutions } = useExecutionContext();
  const router = useRouter();

  const pathname = usePathname();
  const currentConversationId = pathname.split("/").pop();

  useEffect(() => {
    if (executions) {
      setUiExecutions(executions);
    }
  }, [executions]);

  const handleDeleteExecution = (executionId: string) => {
    try {
      const stored = localStorage.getItem("executions");
      if (stored) {
        const parsed = JSON.parse(stored) as Execution[];
        const updated = parsed.filter((e) => e.id !== executionId);
        localStorage.setItem("executions", JSON.stringify(updated));
        refreshExecutions();
        if (executionId === currentConversationId) {
          router.push("/");
        }
        toast.success("Chat deleted locally");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  return (
    <Sidebar className="border-r border-border bg-sidebar h-full hidden md:flex">
      <SidebarContent className="h-full justify-between">
        <SidebarGroup className="flex flex-col gap-4">
          <SidebarHeader className="sticky top-0 !p-0 bg-sidebar z-30">
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
                    // Navigate to home and reset state
                    router.push(`/ask`);
                    // Force a refresh to ensure clean state
                    router.refresh();
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
                : uiExecutions.map((execution: Execution) => (
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
                          <span
                            className="truncate w-full pr-6"
                            title={execution.title}
                          >
                            {execution.title}
                          </span>

                          {(execution.id === hoverChatId ||
                            execution.id === currentConversationId) && (
                            <div
                              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md p-1 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExecution(execution.id);
                              }}
                            >
                              <TrashIcon weight="bold" className="size-3.5" />
                            </div>
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarFooter className="sticky bottom-0 flex flex-col gap-2 w-full p-3 bg-sidebar z-30 border-t border-border/50">
          <div className="text-xs text-muted-foreground text-center">
            Local History • No Auth
          </div>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
