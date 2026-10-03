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
import { PageShell, PageViewSlot } from "@/components/layout/page-shell";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChatPage = ({ params }: { params: any }) => {
  const { id } = use(params as Promise<{ id: string }>);
  const { viewMode } = useViewMode();

  return (
    <PageShell className="h-full min-h-0">
      <div className="relative h-full min-h-0 flex-1">
        {viewMode === "direct" ? (
          <PageViewSlot>
            <ChatInterface key={id} conversationId={id} className="h-full" />
          </PageViewSlot>
        ) : (
          <PageViewSlot>
            <ArenaInterface key={id} conversationId={id} className="h-full" />
          </PageViewSlot>
        )}
      </div>
    </PageShell>
  );
};

export default ChatPage;
