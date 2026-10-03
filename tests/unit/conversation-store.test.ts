import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readConversation,
  resetConversationStoreForTests,
  saveConversation,
} from "@/lib/chat/conversation-store";
import { Role } from "@/lib/types";

function installSessionStorageMock() {
  vi.stubGlobal("window", globalThis);
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
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
  });
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

  it("debounces sessionStorage writes", async () => {
    vi.useFakeTimers();

    saveConversation({
      id: "b",
      title: "Saved",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      messages: [],
    });

    expect(readConversation("b")?.title).toBe("Saved");
    expect(sessionStorage.getItem("conversations")).toBeNull();

    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    expect(sessionStorage.getItem("conversations")).toContain("Saved");
  });
});
