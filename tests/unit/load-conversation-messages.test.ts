import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadConversationMessages,
  resolveConversationPersistId,
} from "@/lib/chat/load-conversation-messages";
import { resetConversationStoreForTests } from "@/lib/chat/conversation-store";
import { ExecutionType } from "@/hooks/useExecution";
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

describe("loadConversationMessages", () => {
  beforeEach(() => {
    resetConversationStoreForTests();
    installSessionStorageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetConversationStoreForTests();
  });

  it("loads messages for a direct chat id on first read", () => {
    sessionStorage.setItem(
      "conversations",
      JSON.stringify({
        "chat-1": {
          id: "chat-1",
          title: "Test",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          messages: [{ id: "m1", role: Role.User, content: "hello" }],
        },
      }),
    );

    const messages = loadConversationMessages("chat-1");
    expect(messages).toHaveLength(1);
    expect(messages[0].shouldAnimate).toBe(false);
  });

  it("uses arena lane persist ids", () => {
    expect(
      resolveConversationPersistId("arena-id", {
        sessionId: "arena-a",
        executionType: ExecutionType.ARENA,
      }),
    ).toBe("arena-id::arena-a");
  });
});
