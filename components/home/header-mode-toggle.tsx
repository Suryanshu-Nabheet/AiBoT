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
import { useSettingsModal } from "@/contexts/settings-modal-context";

export function HeaderModeToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const { viewMode, setViewMode } = useViewMode();
  const { openSettings } = useSettingsModal();

  const isChatPage = pathname === "/" || pathname.startsWith("/chat");

  if (!isChatPage) {
    return null;
  }

  const handleModeChange = (newMode: ViewMode) => {
    if (pathname.startsWith("/chat/")) {
      setViewMode(newMode);
      router.push("/");
      return;
    }
    setViewMode(newMode);
  };

  return (
    <SettingsToggle
      mode={viewMode}
      onChange={handleModeChange}
      onOpenSettings={() => openSettings()}
      className="ml-2"
    />
  );
}
