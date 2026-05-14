/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { use, useEffect } from "react";
import ChatInterface from "@/components/chat/chat-interface";
import ArenaInterface from "@/components/chat/arena-interface";
import { useViewMode } from "@/contexts/view-mode-context";
import { AnimatePresence, motion } from "framer-motion";
import { useExecutionContext } from "@/contexts/execution-context";

import { SettingsPanel } from "@/components/settings/settings-panel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChatPage = ({ params }: { params: any }) => {
  const { id } = use(params as Promise<{ id: string }>);
  const { viewMode, setViewMode } = useViewMode();
  const { executions } = useExecutionContext();

  // The view mode is now primarily driven by the user's manual selection in the header
  // or the initial load. Removing aggressive auto-correction to prevent "double-click" bugs.

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      <AnimatePresence mode="popLayout" initial={false}>
        {viewMode === "direct" && (
          <motion.div
            key="direct"
            className="h-full w-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChatInterface conversationId={id} />
          </motion.div>
        )}
        
        {viewMode === "side-by-side" && (
          <motion.div
            key="arena"
            className="h-full w-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ArenaInterface conversationId={id} />
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
  );
};

export default ChatPage;
