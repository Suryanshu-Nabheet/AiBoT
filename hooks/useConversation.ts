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

// Helper function to save conversation to sessionStorage
export function saveConversation(conversation: Conversation) {
  try {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("conversations");
      const conversations: Record<string, Conversation> = stored
        ? JSON.parse(stored)
        : {};

      conversations[conversation.id] = {
        ...conversation,
        updatedAt: new Date().toISOString(),
      };

      sessionStorage.setItem("conversations", JSON.stringify(conversations));
    }
  } catch (error) {
    console.error("Error saving conversation:", error);
  }
}
