import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readConversation,
  resetConversationStoreForTests,
  saveConversation,
  saveConversationContextSummary,
} from "@/lib/chat/conversation-store";
import { Role } from "@/lib/types";

function installSessionStorageMock() {
  vi.stubGlobal("window", globalThis);
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    length: store.size,
  };
  vi.stubGlobal("sessionStorage", storage);
  vi.stubGlobal("localStorage", storage);
}

describe("conversation-store", () => {
  beforeEach(() => {
    resetConversationStoreForTests();
    installSessionStorageMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetConversationStoreForTests();
  });

  it("reads from cache without re-parsing on every access", () => {
    sessionStorage.setItem(
      "conversations",
      JSON.stringify({
        a: {
          id: "a",
          title: "One",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          messages: [
            {
              id: "m1",
              role: Role.User,
              content: "hi",
            },
          ],
        },
      }),
    );

    const first = readConversation("a");
    sessionStorage.setItem("conversations", "{}");
    const second = readConversation("a");

    expect(first?.messages).toHaveLength(1);
    expect(second?.messages).toHaveLength(1);
  });

  it("debounces durable conversation writes", async () => {
    vi.useFakeTimers();

    saveConversation({
      id: "b",
      title: "Saved",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      messages: [],
    });

    expect(readConversation("b")?.title).toBe("Saved");
    expect(localStorage.getItem("conversations")).toBeNull();

    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    expect(localStorage.getItem("conversations")).toContain("Saved");
  });

  it("migrates old session-only chats into durable storage", () => {
    sessionStorage.setItem(
      "conversations",
      JSON.stringify({
        legacy: {
          id: "legacy",
          title: "Legacy chat",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          messages: [{ id: "m1", role: Role.User, content: "hello" }],
        },
      }),
    );

    expect(readConversation("legacy")?.title).toBe("Legacy chat");
    expect(localStorage.getItem("conversations")).toContain("Legacy chat");
  });

  it("preserves a rolling continuity summary across ordinary message saves", () => {
    const conversation = {
      id: "summary-chat",
      title: "Long chat",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      messages: [{ id: "m1", role: Role.User, content: "A retained detail." }],
    };
    saveConversation(conversation);
    const summary =
      "The user is building a dashboard. They chose indigo for the accent and require accessible contrast. The API migration is still unresolved.";

    saveConversationContextSummary("summary-chat", summary, 36);
    saveConversation({ ...conversation, messages: [...conversation.messages] });

    expect(readConversation("summary-chat")).toMatchObject({
      contextSummary: summary,
      contextSummaryMessageCount: 36,
    });
  });
});
