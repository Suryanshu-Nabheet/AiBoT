import type { Message } from "@/lib/types";
import {
  flushSharedChatMemory,
  listSharedChatMemories,
  saveSharedChatMemory,
} from "@/lib/chat/shared-chat-memory";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  updatedAt: string;
}

const STORAGE_KEY = "conversations";

let cache: Record<string, Conversation> | null = null;

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
let persistChain: Promise<void> = Promise.resolve();

function loadCache(): Record<string, Conversation> {
  if (cache !== null) return cache;
  if (typeof window === "undefined") {
    cache = {};
    return cache;
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    cache = stored ? (JSON.parse(stored) as Record<string, Conversation>) : {};
  } catch (error) {
    console.error("Error loading conversations cache:", error);
    cache = {};
  }
  return cache;
}

/** Synchronous read — uses in-memory cache after first parse. */
export function readConversation(id: string): Conversation | null {
  if (!id) return null;
  const map = loadCache();
  return map[id] ?? null;
}

/** Local conversation snapshots currently available in this browser tab. */
export function listConversations(): Conversation[] {
  const conversations = new Map(
    listSharedChatMemories().map((conversation) => [
      conversation.id,
      conversation,
    ]),
  );
  for (const conversation of Object.values(loadCache())) {
    conversations.set(conversation.id, conversation);
  }
  return Array.from(conversations.values());
}

function persistCacheToSessionStorage() {
  if (typeof window === "undefined" || cache === null) return;
  persistChain = persistChain.then(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  });
}

/** Update cache immediately; debounce sessionStorage write per conversation id. */
export function saveConversation(conversation: Conversation, debounceMs = 400) {
  if (typeof window === "undefined") return;

  const map = loadCache();
  map[conversation.id] = {
    ...conversation,
    updatedAt: new Date().toISOString(),
  };
  saveSharedChatMemory(map[conversation.id]);

  const existing = saveTimers.get(conversation.id);
  if (existing) clearTimeout(existing);

  saveTimers.set(
    conversation.id,
    setTimeout(() => {
      saveTimers.delete(conversation.id);
      persistCacheToSessionStorage();
    }, debounceMs),
  );
}

/** Persist only when debounced saves are pending (fast no-op on navigation). */
export function flushPendingConversationSaves() {
  if (typeof window === "undefined") return;
  if (saveTimers.size > 0) {
    saveTimers.forEach((timer) => clearTimeout(timer));
    saveTimers.clear();
    persistCacheToSessionStorage();
  }
  flushSharedChatMemory();
}

export function flushAllConversationSaves() {
  flushPendingConversationSaves();
}

export function flushSaveConversation(conversation: Conversation) {
  if (typeof window === "undefined") return;

  const map = loadCache();
  map[conversation.id] = {
    ...conversation,
    updatedAt: new Date().toISOString(),
  };
  saveSharedChatMemory(map[conversation.id]);

  const pending = saveTimers.get(conversation.id);
  if (pending) {
    clearTimeout(pending);
    saveTimers.delete(conversation.id);
  }
  persistCacheToSessionStorage();
  flushSharedChatMemory();
}

/** Test helper — reset module cache between tests. */
export function resetConversationStoreForTests() {
  cache = null;
  saveTimers.forEach((timer) => clearTimeout(timer));
  saveTimers.clear();
  persistChain = Promise.resolve();
}
