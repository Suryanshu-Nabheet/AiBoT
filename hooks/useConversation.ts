import { useEffect, useState } from "react";
import { Message } from "@/lib/types";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  updatedAt: string;
}

// In-memory storage ONLY - no persistence
const memoryConversations: Record<string, Conversation> = {};

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
        // Load from memory only
        if (memoryConversations[id]) {
          setConversation(memoryConversations[id]);
        } else {
          setConversation(null);
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

// Helper function to save conversation IN MEMORY ONLY
export function saveConversation(conversation: Conversation) {
  try {
    // Save to memory object - NO storage
    memoryConversations[conversation.id] = {
      ...conversation,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error saving conversation:", error);
  }
}
