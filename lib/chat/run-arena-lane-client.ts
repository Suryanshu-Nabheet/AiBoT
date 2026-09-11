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
import { formatChatApiErrorMessage } from "@/lib/chat/format-api-error";
import { normalizeOllamaUrl } from "@/lib/chat/ollama-url";
import { sanitizeCustomKeysForRequest } from "@/lib/chat/sanitize-custom-keys";
import {
  buildThinkingSystemAddon,
  type ThinkingStage,
} from "@/lib/chat/thinking-mode";
import { deltaFromOllamaLine, deltaFromSseLine } from "@/lib/chat/stream-delta";
import { isLocale, localeReplyDirective, type Locale } from "@/lib/i18n";
import { AIBOT_SYSTEM_PROMPT } from "@/lib/prompts";

async function fetchOllamaWithLoopbackFallback(
  targetUrl: string,
  payload: object,
  signal: AbortSignal,
): Promise<Response> {
  try {
    return await fetch(`${targetUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if (!targetUrl.includes("localhost")) throw err;
    const fallbackUrl = targetUrl.replace("localhost", "127.0.0.1");
    return fetch(`${fallbackUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  }
}

async function pumpResponseToLane(params: {
  response: Response;
  streamKind: "ollama" | "sse";
  lane: ArenaPreparedLane;
  api: ArenaLaneSessionApi;
}) {
  const { response, streamKind, lane, api } = params;

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "Request failed");
    api.finalizeArenaTurn(lane.tempId, formatChatApiErrorMessage(text));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let updateCounter = 0;
  const UPDATE_BATCH = 3;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const delta =
          streamKind === "ollama"
            ? deltaFromOllamaLine(trimmed)
            : deltaFromSseLine(trimmed);
        if (!delta) continue;
        accumulated += delta;
        updateCounter++;
        if (updateCounter >= UPDATE_BATCH || done) {
          updateCounter = 0;
          api.applyArenaStreamDelta(
            lane.tempId,
            accumulated,
            lane.thinkingRequested,
          );
        }
      }
    }

    if (buffer.trim()) {
      const delta =
        streamKind === "ollama"
          ? deltaFromOllamaLine(buffer)
          : deltaFromSseLine(buffer);
      if (delta) accumulated += delta;
    }

    if (accumulated) {
      api.applyArenaStreamDelta(
        lane.tempId,
        accumulated,
        lane.thinkingRequested,
      );
    }

    api.finalizeArenaTurn(lane.tempId);
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      api.finalizeArenaTurn(lane.tempId);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    api.finalizeArenaTurn(lane.tempId, message);
  }
}

export async function runArenaLaneClient(params: {
  lane: ArenaPreparedLane;
  ollamaUrl: string;
  locale: string;
  customKeys: Record<string, string | undefined> | object;
  signal: AbortSignal;
  api: ArenaLaneSessionApi;
}) {
  const {
    lane,
    ollamaUrl,
    locale: rawLocale,
    customKeys,
    signal,
    api,
  } = params;
  const locale: Locale | undefined = isLocale(rawLocale)
    ? rawLocale
    : undefined;

  if (lane.model.startsWith("ollama/")) {
    const stage: ThinkingStage | undefined = lane.thinkingStage;
    let systemPrompt = `You are a helpful AI assistant integrated within the AiBoT platform, developed by Suryanshu Nabheet.\n\n${AIBOT_SYSTEM_PROMPT}`;
    if (locale) systemPrompt += localeReplyDirective(locale);
    if (stage) {
      systemPrompt += `\n\n${buildThinkingSystemAddon(stage)}`;
    }

    const payload = {
      model: lane.model.replace("ollama/", ""),
      messages: [{ role: "system", content: systemPrompt }, ...lane.messages],
      stream: true,
    };

    const targetUrl = normalizeOllamaUrl(ollamaUrl);
    let response = await fetchOllamaWithLoopbackFallback(
      targetUrl,
      payload,
      signal,
    );
    if (!response.ok && targetUrl.includes("localhost")) {
      const fallbackUrl = targetUrl.replace("localhost", "127.0.0.1");
      response = await fetch(`${fallbackUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });
    }

    await pumpResponseToLane({
      response,
      streamKind: "ollama",
      lane,
      api,
    });
    return;
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: lane.messages,
      model: lane.model,
      thinkingStage: lane.thinkingStage,
      customKeys: sanitizeCustomKeysForRequest(
        customKeys as Record<string, string | undefined>,
      ),
      locale: rawLocale,
    }),
    signal,
  });

  await pumpResponseToLane({
    response,
    streamKind: "sse",
    lane,
    api,
  });
}
