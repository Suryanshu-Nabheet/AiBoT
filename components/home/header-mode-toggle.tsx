/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { usePathname, useRouter } from "next/navigation";
import { SettingsToggle, ViewMode } from "@/components/home/settings-toggle";
import { useViewMode } from "@/contexts/view-mode-context";

export function HeaderModeToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const { viewMode, setViewMode } = useViewMode();

  // Only show the mode toggle on chat-related screens
  const isChatPage = pathname === "/" || pathname.startsWith("/chat");
  
  if (!isChatPage) {
    return null;
  }

  const handleModeChange = (newMode: ViewMode) => {
    // If we're in a specific chat and switching mode, go back to a new chat (home)
    if (pathname.startsWith("/chat/") && newMode !== "settings") {
      // Set the mode first, then navigate
      setViewMode(newMode);
      router.push("/");
      return;
    }
    setViewMode(newMode);
  };

  return <SettingsToggle mode={viewMode} onChange={handleModeChange} className="ml-2" />;
}
