"use client";

import { ModeToggle } from "@/components/home/mode-toggle";
import { useViewMode } from "@/contexts/view-mode-context";

export function HeaderModeToggle() {
  const { viewMode, setViewMode } = useViewMode();
  return <ModeToggle mode={viewMode} onChange={setViewMode} className="ml-2" />;
}
