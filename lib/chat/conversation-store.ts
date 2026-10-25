import type { Message } from "@/lib/types";
import {
  flushSharedChatMemory,
  listSharedChatMemories,
  removeSharedChatMemory,
  saveSharedChatMemory,
} from "@/lib/chat/shared-chat-memory";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  updatedAt: string;
  /** Rolling, model-generated continuity context for histories beyond the window. */
  contextSummary?: string;
  contextSummaryMessageCount?: number;
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
  const persistent = safelyReadStorage(() => window.localStorage, STORAGE_KEY);
  const session = safelyReadStorage(() => window.sessionStorage, STORAGE_KEY);
  cache = mergeConversationMaps(persistent, session);

  // Migrate conversations saved by older releases before this tab closes.
  if (Object.keys(persistent).length === 0 && Object.keys(session).length > 0) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // Keep the migrated copy in session storage if durable storage is full.
    }
  }
  return cache;
}

function safelyReadStorage(
  getStorage: () => Storage,
  key: string,
): Record<string, Conversation> {
  try {
    return readStorage(getStorage(), key);
  } catch {
    return {};
  }
}

function readStorage(
  storage: Storage,
  key: string,
): Record<string, Conversation> {
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([id, value]) =>
          typeof id === "string" &&
          Boolean(value) &&
          typeof value === "object" &&
          (value as Conversation).id === id &&
          Array.isArray((value as Conversation).messages),
      ),
    ) as Record<string, Conversation>;
  } catch {
    return {};
  }
}

function mergeConversationMaps(
  ...maps: Record<string, Conversation>[]
): Record<string, Conversation> {
  const merged: Record<string, Conversation> = {};
  for (const map of maps) {
    for (const [id, conversation] of Object.entries(map)) {
      const existing = merged[id];
      if (
        !existing ||
        Date.parse(conversation.updatedAt) >= Date.parse(existing.updatedAt)
      ) {
        merged[id] = conversation;
      }
    }
  }
  return merged;
}

/** Synchronous read — uses in-memory cache after first parse. */
export function readConversation(id: string): Conversation | null {
  if (!id) return null;
  const map = loadCache();
  return (
    map[id] ?? listSharedChatMemories().find((item) => item.id === id) ?? null
  );
}

/** Local conversation snapshots available in this browser profile. */
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      // Preserve at least this browser session if durable storage is blocked
      // or full. The next successful read will merge both copies by timestamp.
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
      } catch (fallbackError) {
        console.error("Error saving conversation:", error, fallbackError);
      }
    }
  });
}

/** Update cache immediately; debounce durable storage per conversation id. */
export function saveConversation(conversation: Conversation, debounceMs = 400) {
  if (typeof window === "undefined") return;

  const map = loadCache();
  map[conversation.id] = {
    ...conversation,
    contextSummary:
      conversation.contextSummary ?? map[conversation.id]?.contextSummary,
    contextSummaryMessageCount:
      conversation.contextSummaryMessageCount ??
      map[conversation.id]?.contextSummaryMessageCount,
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
    contextSummary:
      conversation.contextSummary ?? map[conversation.id]?.contextSummary,
    contextSummaryMessageCount:
      conversation.contextSummaryMessageCount ??
      map[conversation.id]?.contextSummaryMessageCount,
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

/** Persist a compact continuity summary without changing visible chat messages. */
export function saveConversationContextSummary(
  id: string,
  summary: string,
  messageCount: number,
): void {
  if (!id || typeof window === "undefined") return;
  const conversation = readConversation(id);
  if (!conversation) return;
  const normalized = summary.replace(/\s+/g, " ").trim().slice(0, 8_000);
  if (normalized.length < 80) return;
  const map = loadCache();
  map[id] = {
    ...conversation,
    contextSummary: normalized,
    contextSummaryMessageCount: messageCount,
    updatedAt: new Date().toISOString(),
  };
  persistCacheToSessionStorage();
}

/** Delete one chat and its arena lanes from durable history and context memory. */
export function deleteConversation(id: string): void {
  if (!id || typeof window === "undefined") return;
  const map = loadCache();
  const ids = [id, `${id}::arena-a`, `${id}::arena-b`];
  for (const conversationId of ids) {
    const timer = saveTimers.get(conversationId);
    if (timer) clearTimeout(timer);
    saveTimers.delete(conversationId);
    delete map[conversationId];
    removeSharedChatMemory(conversationId);
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
