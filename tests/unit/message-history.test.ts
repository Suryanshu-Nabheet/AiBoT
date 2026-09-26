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
});
