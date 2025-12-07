"use client";
import React, { use } from "react";
import ChatInterface from "@/components/chat/chat-interface";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AskPage = ({ params }: { params: any }) => {
  const { chatId } = use(params as Promise<{ chatId: string }>);
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ChatInterface conversationId={chatId} />
    </div>
  );
};

export default AskPage;
