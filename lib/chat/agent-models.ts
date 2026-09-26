/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/** localStorage keys shared by agent pages + Settings. */
export const AGENT_MODEL_STORAGE = {
  coder: "agent-coder-model",
  voice: "agent-voice-model",
} as const;

export type AgentModelSurface = keyof typeof AGENT_MODEL_STORAGE;

export const DEFAULT_AGENT_MODEL = "openrouter/free";
