/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import ChatInterface from "@/components/chat/chat-interface";
import ArenaInterface from "@/components/chat/arena-interface";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { ViewMode } from "@/components/home/settings-toggle";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useViewMode } from "@/contexts/view-mode-context";

export default function HomePage() {
  const { viewMode } = useViewMode();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      <div className="flex-1 w-full relative min-h-0">
        <AnimatePresence mode="popLayout">
          {viewMode === "direct" && (
            <motion.div
              key="direct"
              className="h-full w-full"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <ChatInterface storageKey="directModel" />
            </motion.div>
          )}
          {viewMode === "side-by-side" && (
            <motion.div
              key="side-by-side"
              className="h-full w-full"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <ArenaInterface />
            </motion.div>
          )}
          {viewMode === "settings" && (
            <motion.div
              key="settings"
              className="h-full w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <SettingsPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
