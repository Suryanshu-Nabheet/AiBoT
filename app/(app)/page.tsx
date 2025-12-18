"use client";

import ChatInterface from "@/components/chat/chat-interface";
import ArenaInterface from "@/components/chat/arena-interface";
import { ViewMode } from "@/components/home/mode-toggle";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useViewMode } from "@/contexts/view-mode-context";

export default function HomePage() {
  const { viewMode } = useViewMode();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      <div className="flex-1 w-full relative min-h-0">
        <AnimatePresence mode="popLayout">
          {viewMode === "direct" ? (
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
          ) : (
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
        </AnimatePresence>
      </div>
    </div>
  );
}
