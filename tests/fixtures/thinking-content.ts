/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import {
  THINKING_CLOSE_TAG,
  THINKING_OPEN_TAG,
} from "@/lib/chat/thinking-mode";

export const STAGE1_ONLY = `${THINKING_OPEN_TAG}
User wants a concise overview of AI. I will structure by definition, history, and applications.
${THINKING_CLOSE_TAG}`;

export const STAGE1_AND_ANSWER = `${THINKING_OPEN_TAG}
Plan: define AI, list key principles, give examples.
${THINKING_CLOSE_TAG}

## What Is Artificial Intelligence?

Artificial intelligence (AI) is the field of building systems that perform tasks requiring human-like reasoning.`;

export const STAGE1_PLACEHOLDER = `${THINKING_OPEN_TAG}
...
${THINKING_CLOSE_TAG}

## Answer

Body text here.`;

export const PLAIN_ASSISTANT = `Here is a direct answer without thinking tags.`;

export const INLINE_HEADING_ANSWER = `Intro paragraph. # Definition: AI is software that learns. # Key Components: data and models.`;
