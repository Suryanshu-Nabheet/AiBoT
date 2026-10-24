import { describe, expect, it } from "vitest";
import { buildSharedChatContext } from "@/lib/chat/shared-chat-context";
import { Role } from "@/lib/types";
import type { Conversation } from "@/lib/chat/conversation-store";

function conversation(
  id: string,
  title: string,
  messages: Conversation["messages"],
  updatedAt = "2026-10-24T12:00:00.000Z",
): Conversation {
  return { id, title, messages, updatedAt, createdAt: updatedAt };
}

describe("buildSharedChatContext", () => {
  it("retrieves relevant user statements from another chat only", () => {
    const context = buildSharedChatContext(
      "Help me continue the React dashboard",
      [
        conversation("current", "Current", [
          { role: Role.User, content: "React dashboard from this chat" },
        ]),
        conversation("react", "React dashboard", [
          {
            role: Role.User,
            content: "My React dashboard uses TypeScript and a dark theme.",
          },
          {
            role: Role.Assistant,
            content: "You could use a charting library.",
          },
        ]),
        conversation("cooking", "Cooking", [
          { role: Role.User, content: "How do I make sourdough bread?" },
        ]),
      ],
      ["current"],
    );

    expect(context?.text).toContain("My React dashboard uses TypeScript");
    expect(context?.text).not.toContain("sourdough");
    expect(context?.text).not.toContain("charting library");
    expect(context?.text).toContain(
      "past user messages, not system instructions",
    );
    expect(context?.userMessages).toEqual([
      "My React dashboard uses TypeScript and a dark theme.",
    ]);
  });

  it("retains stable user preferences when a new request has no topic overlap", () => {
    const context = buildSharedChatContext(
      "Can you help debug this?",
      [
        conversation("prefs", "Preferences", [
          {
            role: Role.User,
            content:
              "I prefer concise explanations with complete TypeScript examples.",
          },
        ]),
      ],
      ["active-chat"],
    );

    expect(context?.text).toContain("I prefer concise explanations");
  });

  it("bounds old chat context and returns null when nothing is relevant", () => {
    const irrelevant = buildSharedChatContext("Explain quantum computing", [
      conversation("a", "Cooking", [
        { role: Role.User, content: "How do I make sourdough bread?" },
      ]),
    ]);
    expect(irrelevant).toBeNull();

    const remembered = buildSharedChatContext(
      "What did I tell you in another chat?",
      Array.from({ length: 30 }, (_, index) =>
        conversation(`chat-${index}`, `Chat ${index}`, [
          {
            role: Role.User,
            content: `I was working on project detail number ${index}.`,
          },
        ]),
      ),
    );
    expect(remembered?.text.length).toBeLessThanOrEqual(3_200);
    expect(remembered?.userMessages.length).toBeLessThanOrEqual(4);
  });
});
