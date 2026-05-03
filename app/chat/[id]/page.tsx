/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { use } from "react";
import ChatInterface from "@/components/chat/chat-interface";
import ArenaInterface from "@/components/chat/arena-interface";
import { useViewMode } from "@/contexts/view-mode-context";
import { AnimatePresence, motion } from "framer-motion";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChatPage = ({ params }: { params: any }) => {
  const { id } = use(params as Promise<{ id: string }>);
  const { viewMode } = useViewMode();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      <AnimatePresence mode="popLayout" initial={false}>
        {viewMode === "direct" ? (
          <motion.div
            key="direct"
            className="h-full w-full"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <ChatInterface conversationId={id} />
          </motion.div>
        ) : (
          <motion.div
            key="arena"
            className="h-full w-full"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <ArenaInterface conversationId={id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;
