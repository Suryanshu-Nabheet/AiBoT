import { useEffect, useState } from "react";
import { Message } from "@/lib/types";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  updatedAt: string;
}

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
        const stored = localStorage.getItem("conversations");
        const conversations: Record<string, Conversation> = stored
          ? JSON.parse(stored)
          : {};

        if (conversations[id]) {
          setConversation(conversations[id]);
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
