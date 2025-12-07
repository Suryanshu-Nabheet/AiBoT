"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ColumnsIcon } from "lucide-react";

export function SidebarToggle({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={toggleSidebar}
    >
      <ColumnsIcon className="h-4 w-4" />
    </Button>
  );
}
