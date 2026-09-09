import "server-only";

import { z } from "zod";

const MAX_MESSAGE_LENGTH = 32_000;
const MAX_HISTORY_MESSAGES = 50;
const apiKey = z.string().trim().min(8).max(512).optional();

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.union([
          z.string().max(MAX_MESSAGE_LENGTH),
          z
            .array(
              z.object({
                type: z.enum(["text", "image_url"]),
                text: z.string().max(MAX_MESSAGE_LENGTH).optional(),
                image_url: z.object({ url: z.string().max(8_000) }).optional(),
              }),
            )
            .max(16),
        ]),
      }),
    )
    .min(1)
    .max(MAX_HISTORY_MESSAGES),
  model: z.string().trim().min(1).max(200),
  isThinking: z.boolean().optional(),
  thinkingStage: z.enum(["thinking", "final"]).optional(),
  locale: z.string().max(10).optional(),
  customKeys: z
    .object({
      openai: apiKey,
      anthropic: apiKey,
      google: apiKey,
      deepseek: apiKey,
      openrouter: apiKey,
    })
    .optional(),
});

export const enhanceRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(12_000),
  locale: z.string().max(10).optional(),
});

export const coachRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(12_000),
      }),
    )
    .min(1)
    .max(30),
});

export const coderRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(20_000),
});

export const summarizeRequestSchema = z
  .object({
    task: z.string().trim().min(1).max(8_000),
    filesData: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(255),
          content: z.string().max(50_000),
        }),
      )
      .min(1)
      .max(5),
  })
  .superRefine(({ filesData }, ctx) => {
    const totalBytes = filesData.reduce(
      (total, file) =>
        total + new TextEncoder().encode(file.content).byteLength,
      0,
    );
    if (totalBytes > 150_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Combined file content exceeds 150 KB",
      });
    }
  });

export const keyVerificationSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "deepseek", "openrouter"]),
  key: z.string().trim().min(8).max(512),
});
