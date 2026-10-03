/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { useEffect, useState } from "react";
import {
  type Conversation,
  readConversation,
  saveConversation,
  flushSaveConversation,
} from "@/lib/chat/conversation-store";

export type { Conversation };

export function useConversationById(id: string | undefined) {
  const [conversation, setConversation] = useState<Conversation | null>(() =>
    id ? readConversation(id) : null,
  );

  useEffect(() => {
    if (!id) {
      setConversation(null);
      return;
    }
    setConversation(readConversation(id));
  }, [id]);

  return {
    conversation,
    loading: false,
    error: null,
  };
}

export { saveConversation, flushSaveConversation };
