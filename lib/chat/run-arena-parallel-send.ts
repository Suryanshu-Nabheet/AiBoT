/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import type {
  ArenaLaneSessionApi,
  ArenaPreparedLane,
} from "@/lib/chat/arena-types";
import { runArenaLaneClient } from "@/lib/chat/run-arena-lane-client";

/** Run each arena lane independently (separate abort signals, parallel fetches). */
export async function runArenaParallelSend(params: {
  lanes: ArenaPreparedLane[];
  signals: Record<string, AbortSignal>;
  laneApi: Record<string, ArenaLaneSessionApi>;
  ollamaUrl: string;
  locale: string;
  customKeys: Record<string, string | undefined> | object;
}): Promise<void> {
  const { lanes, signals, laneApi, ollamaUrl, locale, customKeys } = params;

  await Promise.all(
    lanes.map((lane) => {
      const signal = signals[lane.laneId];
      const api = laneApi[lane.laneId];
      if (!signal || !api) {
        api?.finalizeArenaTurn(
          lane.tempId,
          "Arena lane is not configured correctly.",
        );
        return Promise.resolve();
      }

      return runArenaLaneClient({
        lane,
        ollamaUrl,
        locale,
        customKeys,
        signal,
        api,
      });
    }),
  );
}
