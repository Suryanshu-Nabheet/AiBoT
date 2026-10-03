/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import "server-only";

import { z } from "zod";

const MAX_MESSAGE_LENGTH = 200_000;
const MAX_HISTORY_MESSAGES = 50;
const MAX_IMAGE_URL_LENGTH = 500_000;
const apiKey = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s.length === 0 ? undefined : s;
}, z.string().min(8).max(512).optional());

const contentPartSchema = z.object({
  type: z.enum(["text", "image_url"]),
  text: z.string().max(MAX_MESSAGE_LENGTH).optional(),
  image_url: z.object({ url: z.string().max(MAX_IMAGE_URL_LENGTH) }).optional(),
});

const customKeysSchema = z
  .object({
    openai: apiKey,
    anthropic: apiKey,
    google: apiKey,
    deepseek: apiKey,
    openrouter: apiKey,
  })
  .optional();

export const webSearchRequestSchema = z.object({
  queries: z.array(z.string().trim().min(1).max(500)).min(1).max(3),
  maxResults: z.number().int().min(1).max(12).optional(),
});

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.union([
          z.string().max(MAX_MESSAGE_LENGTH),
          z.array(contentPartSchema).min(1).max(32),
        ]),
      }),
    )
    .min(1)
    .max(MAX_HISTORY_MESSAGES),
  model: z.string().trim().min(1).max(200),
  isThinking: z.boolean().optional(),
  documentWork: z.boolean().optional(),
  thinkingStage: z.enum(["thinking", "final"]).optional(),
  /** Normalized stage-1 reasoning block; required for grounded stage-2 answers. */
  priorReasoning: z.string().max(48_000).optional(),
  locale: z.string().max(10).optional(),
  customKeys: customKeysSchema,
});

const voiceAttachmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.string().trim().min(1).max(120),
  kind: z.enum(["image", "document", "text", "video_frame"]),
  content: z.string().min(1).max(MAX_IMAGE_URL_LENGTH),
  note: z.string().max(500).optional(),
});

const voiceModelFields = {
  model: z.string().trim().min(1).max(200).default("openrouter/free"),
  customKeys: customKeysSchema,
};

export const voiceRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.union([
          z.string().trim().min(1).max(12_000),
          z.array(contentPartSchema).min(1).max(16),
        ]),
      }),
    )
    .min(1)
    .max(30)
    .refine((messages) => messages.some((message) => message.role === "user"), {
      message: "At least one user message is required",
    }),
  attachments: z.array(voiceAttachmentSchema).max(8).optional(),
  ...voiceModelFields,
});

export const keyVerificationSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "deepseek", "openrouter"]),
  key: z.string().trim().min(8).max(512),
});
