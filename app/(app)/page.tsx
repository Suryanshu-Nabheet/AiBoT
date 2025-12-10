"use client";

import ChatInterface from "@/components/chat/chat-interface";

export default function HomePage() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      <ChatInterface />
    </div>
  );
}
