/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/home/mode-toggle";
import { useViewMode } from "@/contexts/view-mode-context";

export function HeaderModeToggle() {
  const pathname = usePathname();
  const { viewMode, setViewMode } = useViewMode();



  return <ModeToggle mode={viewMode} onChange={setViewMode} className="ml-2" />;
}
