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
import { SettingsPanel } from "@/components/settings/settings-panel";
import { PageShell, PageViewSlot } from "@/components/layout/page-shell";

const viewMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

const settingsMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChatPage = ({ params }: { params: any }) => {
  const { id } = use(params as Promise<{ id: string }>);
  const { viewMode } = useViewMode();

  return (
    <PageShell>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === "direct" && (
            <motion.div
              key="direct"
              {...viewMotion}
              className="absolute inset-0"
            >
              <PageViewSlot>
                <ChatInterface conversationId={id} />
              </PageViewSlot>
            </motion.div>
          )}

          {viewMode === "side-by-side" && (
            <motion.div
              key="arena"
              {...viewMotion}
              className="absolute inset-0"
            >
              <PageViewSlot>
                <ArenaInterface conversationId={id} />
              </PageViewSlot>
            </motion.div>
          )}

          {viewMode === "settings" && (
            <motion.div
              key="settings"
              {...settingsMotion}
              className="absolute inset-0"
            >
              <PageViewSlot>
                <SettingsPanel />
              </PageViewSlot>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
};

export default ChatPage;
