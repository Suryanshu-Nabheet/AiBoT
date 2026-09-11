/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { v4 } from "uuid";
import { useExecutionContext } from "@/contexts/execution-context";
import { useSettings } from "@/contexts/settings-context";
import { runArenaParallelSend } from "@/lib/chat/run-arena-parallel-send";
import { useChatSession } from "@/hooks/use-chat-session";

const LANE_A = "arena-a";
const LANE_B = "arena-b";

export function useArenaChat(initialConversationId?: string) {
  const [arenaConversationId] = useState(() => initialConversationId || v4());
  const { apiKeys, ollamaUrl, locale } = useSettings();
  const { refreshExecutions } = useExecutionContext();

  const left = useChatSession({
    storageKey: LANE_A,
    sessionId: LANE_A,
    conversationId: arenaConversationId,
    executionType: "ARENA",
    viewMode: "side-by-side",
  });

  const right = useChatSession({
    storageKey: LANE_B,
    sessionId: LANE_B,
    conversationId: arenaConversationId,
    executionType: "ARENA",
    viewMode: "side-by-side",
  });

  const leftRef = useRef(left);
  leftRef.current = left;
  const rightRef = useRef(right);
  rightRef.current = right;

  const laneAbortRef = useRef<Record<string, AbortController>>({});

  const stopBoth = useCallback(() => {
    for (const controller of Object.values(laneAbortRef.current)) {
      controller.abort();
    }
    laneAbortRef.current = {};
  }, []);

  const submitBoth = useCallback(
    (
      query: string,
      attachments: { name: string; content: string; type: string }[],
      leftThinking: boolean,
      rightThinking: boolean,
    ): boolean => {
      const leftSession = leftRef.current;
      const rightSession = rightRef.current;

      if (!query.trim() || leftSession.isLoading || rightSession.isLoading) {
        return false;
      }

      const leftPrep = leftSession.prepareArenaTurn(
        query,
        attachments,
        leftThinking,
      );
      if (!leftPrep) return false;

      const rightPrep = rightSession.prepareArenaTurn(
        query,
        attachments,
        rightThinking,
      );
      if (!rightPrep) {
        leftSession.cancelArenaTurn(leftPrep.tempId);
        return false;
      }

      for (const controller of Object.values(laneAbortRef.current)) {
        controller.abort();
      }

      const leftController = new AbortController();
      const rightController = new AbortController();
      laneAbortRef.current = {
        [LANE_A]: leftController,
        [LANE_B]: rightController,
      };

      void runArenaParallelSend({
        lanes: [leftPrep, rightPrep],
        signals: {
          [LANE_A]: leftController.signal,
          [LANE_B]: rightController.signal,
        },
        laneApi: {
          [LANE_A]: {
            applyArenaStreamDelta: leftSession.applyArenaStreamDelta,
            finalizeArenaTurn: (tempId, error) =>
              leftSession.finalizeArenaTurn(tempId, error, {
                refreshSidebar: false,
              }),
          },
          [LANE_B]: {
            applyArenaStreamDelta: rightSession.applyArenaStreamDelta,
            finalizeArenaTurn: (tempId, error) =>
              rightSession.finalizeArenaTurn(tempId, error, {
                refreshSidebar: false,
              }),
          },
        },
        ollamaUrl,
        locale,
        customKeys: apiKeys,
      }).finally(() => {
        laneAbortRef.current = {};
        refreshExecutions();
      });

      return true;
    },
    [apiKeys, locale, ollamaUrl, refreshExecutions],
  );

  return {
    arenaConversationId,
    left,
    right,
    submitBoth,
    stopBoth,
  };
}
