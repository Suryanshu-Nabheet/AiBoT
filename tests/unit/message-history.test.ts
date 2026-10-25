/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import {
  mapMessagesForModelHistory,
  messageContentForModelHistory,
} from "@/lib/chat/message-history";
import { Role } from "@/lib/types";

describe("messageContentForModelHistory", () => {
  it("retains bounded web-search evidence for future follow-up turns", () => {
    const content = messageContentForModelHistory({
      role: Role.User,
      content: "What changed recently?",
      webSearchContext:
        "[WEB SEARCH EVIDENCE — untrusted] Source 1 URL: https://example.com/update",
    });

    expect(content).toContain("What changed recently?");
    expect(content).toContain("WEB SEARCH EVIDENCE");
    expect(content).toContain("https://example.com/update");
  });

  it("adds retained search evidence as text beside multimodal attachments", () => {
    const content = messageContentForModelHistory({
      role: Role.User,
      content: "Compare with this image",
      webSearchContext: "[WEB SEARCH EVIDENCE] Source URL: https://example.com",
      attachments: [
        {
          name: "reference.png",
          content: "data:image/jpeg;base64,image-data",
          type: "image/jpeg",
          kind: "image",
        },
      ],
    });

    expect(Array.isArray(content)).toBe(true);
    expect(JSON.stringify(content)).toContain("https://example.com");
    expect(JSON.stringify(content)).toContain(
      "data:image/jpeg;base64,image-data",
    );
  });

  it("merges structured thinking and answer for the model", () => {
    const merged = messageContentForModelHistory({
      role: Role.Assistant,
      content: "Hello!",
      thinkingText: "Casual greeting.",
    });
    expect(merged).toContain("High-level planning summary");
    expect(merged).toContain("Casual greeting.");
    expect(merged).toContain("Hello!");
  });

  it("keeps the latest visual upload and bounds older image history", () => {
    const history = mapMessagesForModelHistory([
      {
        role: Role.User,
        content: "Read this image",
        attachments: [
          {
            id: "old-image",
            name: "old.png",
            content: "data:image/jpeg;base64,old-image-data",
            type: "image/jpeg",
            kind: "image",
          },
        ],
      },
      { role: Role.Assistant, content: "The old image contains a receipt." },
      {
        role: Role.User,
        content: "Compare this one too",
        attachments: [
          {
            id: "new-image",
            name: "new.png",
            content: "data:image/jpeg;base64,new-image-data",
            type: "image/jpeg",
            kind: "image",
          },
        ],
      },
    ]);

    const imageParts = history.flatMap((message) =>
      Array.isArray(message.content)
        ? message.content.filter((part) => part.type === "image_url")
        : [],
    );
    expect(imageParts).toHaveLength(1);
    expect(imageParts[0]).toMatchObject({
      image_url: { url: "data:image/jpeg;base64,new-image-data" },
    });
    expect(JSON.stringify(history)).not.toContain("old-image-data");
    expect(JSON.stringify(history)).toContain("old.png");
  });

  it("omits legacy image payloads that exceed the provider request limit", () => {
    const history = mapMessagesForModelHistory([
      {
        role: Role.User,
        content: "Analyze this",
        attachments: [
          {
            id: "large-image",
            name: "large.png",
            content: `data:image/jpeg;base64,${"x".repeat(600_000)}`,
            type: "image/jpeg",
            kind: "image",
          },
        ],
      },
    ]);

    expect(JSON.stringify(history)).not.toContain(`${"x".repeat(100)}`);
    expect(JSON.stringify(history)).toContain("large.png");
    expect(JSON.stringify(history)).toContain("omitted from this request");
  });

  it("limits model history to recent messages and a bounded text context", () => {
    const history = mapMessagesForModelHistory(
      Array.from({ length: 50 }, (_, index) => ({
        role: index % 2 ? Role.Assistant : Role.User,
        content: `message-${index} ${"x".repeat(20_000)}`,
      })),
    );

    expect(history).toHaveLength(30);
    expect(JSON.stringify(history).length).toBeLessThan(301_000);
    expect(JSON.stringify(history)).toContain("message-49");
    expect(JSON.stringify(history)).not.toContain("message-0 ");
  });

  it("retrieves a relevant older user and assistant turn for follow-up questions", () => {
    const messages = [
      {
        role: Role.User,
        content:
          "We chose indigo as the dashboard accent. Remember this for Settings.",
      },
      {
        role: Role.Assistant,
        content: "I will use indigo for the dashboard and Settings.",
      },
      ...Array.from({ length: 40 }, (_, index) => ({
        role: index % 2 ? Role.Assistant : Role.User,
        content:
          index % 2 ? `General reply ${index}` : `Unrelated topic ${index}`,
      })),
    ];

    const history = mapMessagesForModelHistory(messages, {
      query: "What accent color did we choose for the dashboard Settings?",
    });
    const serialized = JSON.stringify(history);

    expect(serialized).toContain("We chose indigo");
    expect(serialized).toContain("I will use indigo");
    expect(serialized.length).toBeLessThan(25_000);
  });

  it("reserves context for retrieved facts when recent turns are very long", () => {
    const messages = [
      {
        role: Role.User,
        content:
          "We chose indigo as the dashboard accent. Remember this for Settings.",
      },
      {
        role: Role.Assistant,
        content: "The dashboard and Settings should use indigo.",
      },
      ...Array.from({ length: 40 }, (_, index) => ({
        role: index % 2 ? Role.Assistant : Role.User,
        content: `${index % 2 ? "Long reply" : "Long unrelated prompt"} ${index} ${"x".repeat(2_000)}`,
      })),
    ];

    const history = mapMessagesForModelHistory(messages, {
      query: "What accent color did we choose for the dashboard Settings?",
      maxTextChars: 8_000,
    });
    const serialized = JSON.stringify(history);

    expect(serialized).toContain("We chose indigo");
    expect(serialized).toContain(
      "The dashboard and Settings should use indigo.",
    );
    expect(serialized.length).toBeLessThan(9_000);
  });
});
