/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import ChatInterface from "@/components/chat/chat-interface";
import { PageShell, PageViewSlot } from "@/components/layout/page-shell";

const ChatPage = () => {
  return (
    <PageShell>
      <div className="relative min-h-0 flex-1">
        <PageViewSlot>
          <ChatInterface />
        </PageViewSlot>
      </div>
    </PageShell>
  );
};

export default ChatPage;
