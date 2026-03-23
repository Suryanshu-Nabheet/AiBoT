"use client";

import React, { use } from "react";
import ChatInterface from "@/components/chat/chat-interface";
import ArenaInterface from "@/components/chat/arena-interface";
import { useViewMode } from "@/contexts/view-mode-context";
import { AnimatePresence, motion } from "framer-motion";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AskPage = ({ params }: { params: any }) => {
  const { chatId } = use(params as Promise<{ chatId: string }>);
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
            <ChatInterface conversationId={chatId} />
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
            <ArenaInterface conversationId={chatId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AskPage;
