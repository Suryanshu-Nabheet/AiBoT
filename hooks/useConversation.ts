/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { useEffect, useState } from "react";
import { Message } from "@/lib/types";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  updatedAt: string;
}

// In-memory storage was removed. Now using sessionStorage directly in hooks/helpers.

export function useConversationById(id: string | undefined) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessage = () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (typeof window !== "undefined") {
          const stored = sessionStorage.getItem("conversations");
          const conversations: Record<string, Conversation> = stored
            ? JSON.parse(stored)
            : {};

          if (conversations[id]) {
            setConversation(conversations[id]);
          } else {
            setConversation(null);
          }
        }
      } catch (error) {
        console.error("Error fetching conversation:", error);
        setError("Failed to fetch the conversation");
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [id]);

  return { conversation, loading, error };
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
let persistChain: Promise<void> = Promise.resolve();

// Helper function to save conversation to sessionStorage (debounced per id).
export function saveConversation(conversation: Conversation, debounceMs = 400) {
  if (typeof window === "undefined") return;

  const existing = saveTimers.get(conversation.id);
  if (existing) clearTimeout(existing);

  saveTimers.set(
    conversation.id,
    setTimeout(() => {
      saveTimers.delete(conversation.id);
      flushSaveConversation(conversation);
    }, debounceMs),
  );
}

export function flushSaveConversation(conversation: Conversation) {
  if (typeof window === "undefined") return;

  persistChain = persistChain.then(() => {
    try {
      const stored = sessionStorage.getItem("conversations");
      const conversations: Record<string, Conversation> = stored
        ? JSON.parse(stored)
        : {};

      conversations[conversation.id] = {
        ...conversation,
        updatedAt: new Date().toISOString(),
      };

      sessionStorage.setItem("conversations", JSON.stringify(conversations));
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  });
}
