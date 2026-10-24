import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSharedChatMemory,
  flushSharedChatMemory,
  isSharedChatMemoryEnabled,
  listSharedChatMemories,
  resetSharedChatMemoryForTests,
  saveSharedChatMemory,
  setSharedChatMemoryEnabled,
} from "@/lib/chat/shared-chat-memory";
import { Role, type Message } from "@/lib/types";

const values = new Map<string, string>();

function createWindowStub() {
  return {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  };
}

describe("shared chat memory", () => {
  afterEach(() => {
    resetSharedChatMemoryForTests();
    values.clear();
    vi.unstubAllGlobals();
  });

  it("persists only bounded user-authored text for later sessions", () => {
    vi.stubGlobal("window", createWindowStub());
    const messages: Message[] = [
      { role: Role.User, content: "My dashboard uses React and TypeScript." },
      { role: Role.Assistant, content: "Assistant-only private response." },
    ];
    saveSharedChatMemory({
      id: "chat-1",
      title: "Dashboard",
      createdAt: "2026-10-24T00:00:00.000Z",
      updatedAt: "2026-10-24T00:00:00.000Z",
      messages,
    });
    flushSharedChatMemory();

    const restored = listSharedChatMemories();
    expect(restored).toHaveLength(1);
    expect(restored[0]?.messages.map((message) => message.content)).toEqual([
      "My dashboard uses React and TypeScript.",
    ]);
    expect(values.get("aibot-shared-chat-memory-v1")).toContain("Dashboard");
    expect(values.get("aibot-shared-chat-memory-v1")).not.toContain(
      "Assistant-only private response.",
    );
  });

  it("handles unavailable browser storage without throwing", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("storage disabled");
        },
        setItem: () => {
          throw new Error("storage disabled");
        },
      },
    });
    expect(() =>
      saveSharedChatMemory({
        id: "chat-1",
        title: "Dashboard",
        createdAt: "2026-10-24T00:00:00.000Z",
        updatedAt: "2026-10-24T00:00:00.000Z",
        messages: [
          { role: Role.User, content: "A sufficiently long user message." },
        ],
      }),
    ).not.toThrow();
    expect(listSharedChatMemories()).toHaveLength(1);
  });

  it("preserves unsaved memory updates from multiple chats during debounce", () => {
    vi.stubGlobal("window", createWindowStub());
    const base = {
      createdAt: "2026-10-24T00:00:00.000Z",
      updatedAt: "2026-10-24T00:00:00.000Z",
    };
    saveSharedChatMemory({
      ...base,
      id: "chat-1",
      title: "First chat",
      messages: [
        { role: Role.User, content: "A sufficiently long first message." },
      ],
    });
    saveSharedChatMemory({
      ...base,
      id: "chat-2",
      title: "Second chat",
      messages: [
        { role: Role.User, content: "A sufficiently long second message." },
      ],
    });
    flushSharedChatMemory();

    expect(
      listSharedChatMemories()
        .map((chat) => chat.id)
        .sort(),
    ).toEqual(["chat-1", "chat-2"]);
  });

  it("stops reading and writing shared memory when disabled", () => {
    vi.stubGlobal("window", createWindowStub());
    setSharedChatMemoryEnabled(false);
    saveSharedChatMemory({
      id: "chat-1",
      title: "Dashboard",
      createdAt: "2026-10-24T00:00:00.000Z",
      updatedAt: "2026-10-24T00:00:00.000Z",
      messages: [
        { role: Role.User, content: "A sufficiently long user message." },
      ],
    });

    expect(isSharedChatMemoryEnabled()).toBe(false);
    expect(listSharedChatMemories()).toEqual([]);
    expect(values.has("aibot-shared-chat-memory-v1")).toBe(false);
  });

  it("clears persisted snippets without deleting conversation history", () => {
    vi.stubGlobal("window", createWindowStub());
    saveSharedChatMemory({
      id: "chat-1",
      title: "Dashboard",
      createdAt: "2026-10-24T00:00:00.000Z",
      updatedAt: "2026-10-24T00:00:00.000Z",
      messages: [
        { role: Role.User, content: "A sufficiently long user message." },
      ],
    });
    flushSharedChatMemory();
    clearSharedChatMemory();

    expect(values.has("aibot-shared-chat-memory-v1")).toBe(false);
    expect(listSharedChatMemories()).toEqual([]);
    expect(isSharedChatMemoryEnabled()).toBe(true);
  });
});
