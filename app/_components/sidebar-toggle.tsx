"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { SidebarSimple } from "@phosphor-icons/react";

export function SidebarToggle({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();

  return (
    <div
      className={cn(
        "p-2 rounded-md bg-blue-100/50 text-blue-600 cursor-pointer hover:bg-blue-100 transition-colors",
        className
      )}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
    >
      <SidebarSimple className="size-5" />
    </div>
  );
}
