import { readConversation } from "@/lib/chat/conversation-store";
import { getConversationPersistId } from "@/lib/chat/conversation-persist";
import { normalizeStoredMessages } from "@/lib/chat/normalize-stored-messages";
import type { Message } from "@/lib/types";
import type { ExecutionType } from "@/hooks/useExecution";

export function resolveConversationPersistId(
  conversationId: string | null | undefined,
  options?: { sessionId?: string; executionType?: ExecutionType },
): string | null {
  if (!conversationId) return null;
  return (
    getConversationPersistId(conversationId, {
      sessionId: options?.sessionId,
      executionType: options?.executionType,
    }) ?? conversationId
  );
}

function mapStoredMessages(stored: { messages: unknown[] } | null): Message[] {
  if (!stored?.messages?.length) return [];
  return normalizeStoredMessages(stored.messages);
}

export function loadConversationMessages(
  conversationId: string | null | undefined,
  options?: { sessionId?: string; executionType?: ExecutionType },
): Message[] {
  const persistId = resolveConversationPersistId(conversationId, options);
  if (!persistId) return [];
  return mapStoredMessages(readConversation(persistId));
}

export function getConversationInitialState(
  conversationId: string | null | undefined,
  options?: { sessionId?: string; executionType?: ExecutionType },
): { messages: Message[]; showWelcome: boolean } {
  if (!conversationId) {
    return { messages: [], showWelcome: true };
  }
  const messages = loadConversationMessages(conversationId, options);
  return {
    messages,
    showWelcome: messages.length === 0,
  };
}
