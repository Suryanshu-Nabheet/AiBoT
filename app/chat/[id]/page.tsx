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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChatPage = ({ params }: { params: any }) => {
  const { id } = use(params as Promise<{ id: string }>);
  const { viewMode, setViewMode } = useViewMode();
  const { executions } = useExecutionContext();

  // Force the correct view mode based on the conversation's history
  useEffect(() => {
    if (id && executions.length > 0) {
      const currentExecution = executions.find((e) => e.id === id);
      if (currentExecution?.mode && currentExecution.mode !== viewMode) {
        setViewMode(currentExecution.mode);
      }
    }
  }, [id, executions, viewMode, setViewMode]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      <AnimatePresence mode="popLayout" initial={false}>
        {viewMode === "direct" ? (
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
        ) : (
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
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;
