/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

export type ArenaPreparedLane = {
  laneId: string;
  model: string;
  messages: { role: "user" | "assistant"; content: string }[];
  thinkingStage?: "combined";
  tempId: string;
  thinkingRequested: boolean;
};

export type ArenaLaneSessionApi = {
  applyArenaStreamDelta: (
    tempId: string,
    content: string,
    thinkingRequested: boolean,
  ) => void;
  finalizeArenaTurn: (tempId: string, errorMessage?: string) => void;
};
