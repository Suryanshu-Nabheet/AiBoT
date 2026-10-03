import { flushPendingConversationSaves } from "@/lib/chat/conversation-store";

export const NEW_CHAT_EVENT = "aibot:new-chat";

const SESSION_KEYS = [
  "session-directModel",
  "session-arena-a",
  "session-arena-b",
] as const;

export function clearChatSessionPointers() {
  if (typeof window === "undefined") return;
  for (const key of SESSION_KEYS) {
    sessionStorage.removeItem(key);
  }
}

/** Reset composer session pointers and remount home chat (same-tab). */
export function requestNewChat() {
  if (typeof window === "undefined") return;
  flushPendingConversationSaves();
  clearChatSessionPointers();
  window.dispatchEvent(new CustomEvent(NEW_CHAT_EVENT));
}
