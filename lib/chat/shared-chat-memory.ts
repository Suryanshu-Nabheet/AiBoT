import type { Conversation } from "@/lib/chat/conversation-store";
import { Role } from "@/lib/types";

const STORAGE_KEY = "aibot-shared-chat-memory-v1";
const ENABLED_KEY = "aibot-shared-chat-memory-enabled";
const MAX_CONVERSATIONS = 24;
const MAX_MESSAGES_PER_CONVERSATION = 20;
const MAX_MESSAGE_CHARS = 680;
const MAX_TOTAL_CHARS = 96_000;
const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1_000;

type MemoryRecord = {
  id: string;
  title: string;
  updatedAt: string;
  messages: string[];
};

let memoryCache: MemoryRecord[] | null = null;
let persistTimer: ReturnType<typeof setTimeout> | undefined;
let enabledOverride: boolean | null = null;

export function isSharedChatMemoryEnabled(): boolean {
  if (enabledOverride !== null) return enabledOverride;
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(ENABLED_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setSharedChatMemoryEnabled(enabled: boolean): void {
  enabledOverride = enabled;
  if (!enabled && persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = undefined;
    memoryCache = null;
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ENABLED_KEY, String(enabled));
  } catch {
    // The current setting still applies in memory for this page lifetime.
  }
}

export function clearSharedChatMemory(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = undefined;
  memoryCache = [];
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The in-memory index is cleared even when persistent storage is blocked.
  }
}

export function getSharedChatMemorySummary(): {
  conversationCount: number;
  messageCount: number;
} {
  const records = readRecords(true);
  return {
    conversationCount: records.length,
    messageCount: records.reduce(
      (sum, record) => sum + record.messages.length,
      0,
    ),
  };
}

function validRecord(value: unknown): value is MemoryRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MemoryRecord>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.updatedAt === "string" &&
    Array.isArray(item.messages) &&
    item.messages.every((message) => typeof message === "string")
  );
}

function readRecords(forceRefresh = false): MemoryRecord[] {
  if (memoryCache && !forceRefresh) return memoryCache;
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    const cutoff = Date.now() - MAX_AGE_MS;
    const storedRecords = (Array.isArray(parsed) ? parsed : []).filter(
      validRecord,
    );
    // Keep unsaved local writes when another conversation is updated before
    // the debounce fires, while also seeing newer writes from other tabs.
    const merged = new Map<string, MemoryRecord>();
    for (const record of [...storedRecords, ...(memoryCache ?? [])]) {
      const existing = merged.get(record.id);
      if (
        !existing ||
        Date.parse(record.updatedAt) >= Date.parse(existing.updatedAt)
      ) {
        merged.set(record.id, record);
      }
    }
    memoryCache = Array.from(merged.values())
      .filter(validRecord)
      .filter((record) => Date.parse(record.updatedAt) >= cutoff)
      .map((record) => ({
        ...record,
        title: record.title.slice(0, 100),
        messages: record.messages
          .slice(-MAX_MESSAGES_PER_CONVERSATION)
          .map((message) => message.slice(0, MAX_MESSAGE_CHARS)),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_CONVERSATIONS);
  } catch {
    memoryCache ??= [];
  }
  return memoryCache;
}

function trimToStorageBudget(records: MemoryRecord[]): MemoryRecord[] {
  const trimmed = records.map((record) => ({
    ...record,
    messages: [...record.messages],
  }));
  let total = trimmed.reduce(
    (sum, record) =>
      sum +
      record.title.length +
      record.messages.reduce((n, message) => n + message.length, 0),
    0,
  );
  // Drop the oldest user statements first while retaining recent chat topics.
  for (const record of [...trimmed].reverse()) {
    while (total > MAX_TOTAL_CHARS && record.messages.length > 1) {
      total -= record.messages.shift()?.length ?? 0;
    }
    if (total <= MAX_TOTAL_CHARS) break;
  }
  while (total > MAX_TOTAL_CHARS && trimmed.length > 1) {
    const removed = trimmed.pop();
    total -= removed
      ? removed.title.length +
        removed.messages.reduce((n, message) => n + message.length, 0)
      : 0;
  }
  return trimmed;
}

function schedulePersist() {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = undefined;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(memoryCache ?? []),
      );
    } catch {
      // Context memory is best-effort; storage limits must not block chat.
    }
  }, 1_000);
}

/** Persist only bounded, user-authored plain text for cross-session retrieval. */
export function saveSharedChatMemory(conversation: Conversation): void {
  if (typeof window === "undefined" || !isSharedChatMemoryEnabled()) return;
  const messages = conversation.messages
    .filter((message) => message.role === Role.User)
    .slice(-MAX_MESSAGES_PER_CONVERSATION)
    .map((message) =>
      message.content.replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_CHARS),
    )
    .filter((message) => message.length >= 8);
  if (messages.length === 0) return;

  const records = readRecords(true).filter(
    (record) => record.id !== conversation.id,
  );
  const next = trimToStorageBudget(
    [
      {
        id: conversation.id,
        title: conversation.title.replace(/\s+/g, " ").slice(0, 100),
        updatedAt: conversation.updatedAt,
        messages,
      },
      ...records,
    ].slice(0, MAX_CONVERSATIONS),
  );
  memoryCache = next;
  schedulePersist();
}

/** Read fresh localStorage state so memory written in another tab is visible. */
export function listSharedChatMemories(): Conversation[] {
  if (!isSharedChatMemoryEnabled()) return [];
  return readRecords(true).map((record) => ({
    id: record.id,
    title: record.title,
    createdAt: record.updatedAt,
    updatedAt: record.updatedAt,
    messages: record.messages.map((content) => ({ role: Role.User, content })),
  }));
}

/** Flush pending memory when the user navigates away from the active chat. */
export function flushSharedChatMemory(): void {
  if (typeof window === "undefined" || !persistTimer) return;
  clearTimeout(persistTimer);
  persistTimer = undefined;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache ?? []));
  } catch {
    // Context memory is best-effort; storage limits must not block chat.
  }
}

export function resetSharedChatMemoryForTests(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = undefined;
  memoryCache = null;
  enabledOverride = null;
}
