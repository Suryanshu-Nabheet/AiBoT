/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import ChatInterface from "@/components/chat/chat-interface";
import ArenaInterface from "@/components/chat/arena-interface";
import { AnimatePresence, motion } from "framer-motion";
import { useViewMode } from "@/contexts/view-mode-context";
import { PageShell, PageViewSlot } from "@/components/layout/page-shell";

const viewMotion = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2 },
};

export default function HomePage() {
  const { viewMode } = useViewMode();

  return (
    <PageShell className="h-full min-h-0">
      <div className="relative h-full min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === "direct" && (
            <motion.div
              key="direct"
              {...viewMotion}
              className="absolute inset-0"
            >
              <PageViewSlot>
                <ChatInterface storageKey="directModel" className="h-full" />
              </PageViewSlot>
            </motion.div>
          )}
          {viewMode === "side-by-side" && (
            <motion.div
              key="side-by-side"
              {...viewMotion}
              className="absolute inset-0"
            >
              <PageViewSlot>
                <ArenaInterface />
              </PageViewSlot>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
