import {
  flushSaveConversation,
  readConversation,
  saveConversation,
} from "@/lib/chat/conversation-store";
import { translate, type Locale } from "@/lib/i18n";
import { Role, type Message } from "@/lib/types";

export function persistConversationSnapshot(
  conversationPersistId: string,
  messages: Message[],
  locale: Locale,
): void {
  if (!conversationPersistId) return;

  const existing = readConversation(conversationPersistId);
  const firstUser = messages.find((m) => m.role === Role.User);

  saveConversation({
    id: conversationPersistId,
    title:
      existing?.title ||
      firstUser?.content.substring(0, 50) ||
      translate(locale, "chat.defaultTitle"),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    messages,
    updatedAt: new Date().toISOString(),
  });
}

/** Write through debounced cache immediately (navigation / unmount). */
export function flushPersistConversationSnapshot(
  conversationPersistId: string,
  messages: Message[],
  locale: Locale,
): void {
  persistConversationSnapshot(conversationPersistId, messages, locale);
  const snap = readConversation(conversationPersistId);
  if (snap) flushSaveConversation(snap);
}
