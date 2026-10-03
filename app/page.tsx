/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useEffect, useState } from "react";
import ChatInterface from "@/components/chat/chat-interface";
import ArenaInterface from "@/components/chat/arena-interface";
import { useViewMode } from "@/contexts/view-mode-context";
import { PageShell, PageViewSlot } from "@/components/layout/page-shell";
import { NEW_CHAT_EVENT } from "@/lib/chat/new-chat-session";

export default function HomePage() {
  const { viewMode } = useViewMode();
  const [homeChatKey, setHomeChatKey] = useState(0);

  useEffect(() => {
    const onNewChat = () => setHomeChatKey((key) => key + 1);
    window.addEventListener(NEW_CHAT_EVENT, onNewChat);
    return () => window.removeEventListener(NEW_CHAT_EVENT, onNewChat);
  }, []);

  return (
    <PageShell className="h-full min-h-0">
      <div className="relative h-full min-h-0 flex-1">
        {viewMode === "direct" ? (
          <PageViewSlot>
            <ChatInterface
              key={homeChatKey}
              storageKey="directModel"
              className="h-full"
            />
          </PageViewSlot>
        ) : (
          <PageViewSlot>
            <ArenaInterface key={homeChatKey} className="h-full" />
          </PageViewSlot>
        )}
      </div>
    </PageShell>
  );
}
