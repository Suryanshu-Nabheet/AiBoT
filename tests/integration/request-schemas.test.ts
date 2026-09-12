/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import { createChatRequestBody } from "../helpers/factories";
import {
  chatRequestSchema,
  enhanceRequestSchema,
} from "@/lib/server/request-schemas";

describe("chatRequestSchema", () => {
  it("accepts a minimal valid payload", () => {
    const result = chatRequestSchema.safeParse(createChatRequestBody());
    expect(result.success).toBe(true);
  });

  it("accepts thinking stage-2 fields", () => {
    const result = chatRequestSchema.safeParse(
      createChatRequestBody({
        isThinking: true,
        thinkingStage: "final",
        priorReasoning: "<thinking>trace</thinking>",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects legacy combined thinking stage", () => {
    const result = chatRequestSchema.safeParse(
      createChatRequestBody({
        isThinking: true,
        thinkingStage: "combined",
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects empty messages", () => {
    const result = chatRequestSchema.safeParse(
      createChatRequestBody({ messages: [] }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts multimodal image_url content parts", () => {
    const result = chatRequestSchema.safeParse(
      createChatRequestBody({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this" },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${"a".repeat(100)}`,
                },
              },
            ],
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects missing model", () => {
    const body = createChatRequestBody();
    const { model: _removed, ...rest } = body as { model: string };
    const result = chatRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("enhanceRequestSchema", () => {
  it("requires non-empty prompt", () => {
    expect(enhanceRequestSchema.safeParse({ prompt: "" }).success).toBe(false);
    expect(
      enhanceRequestSchema.safeParse({ prompt: "improve this" }).success,
    ).toBe(true);
  });
});
