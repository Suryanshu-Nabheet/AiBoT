"use client";

import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/home/mode-toggle";
import { useViewMode } from "@/contexts/view-mode-context";

export function HeaderModeToggle() {
  const pathname = usePathname();
  const { viewMode, setViewMode } = useViewMode();

  if (pathname !== "/") return null;

  return <ModeToggle mode={viewMode} onChange={setViewMode} className="ml-2" />;
}
