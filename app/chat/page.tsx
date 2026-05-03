/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import React from "react";
import ChatInterface from "@/components/chat/chat-interface";

const ChatPage = () => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ChatInterface />
    </div>
  );
};

export default ChatPage;
