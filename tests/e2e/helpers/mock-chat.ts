/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import type { Page } from "@playwright/test";

/** Mock proxied chat so e2e does not need real API keys. */
export async function mockChatStream(page: Page, assistantText = "pong") {
  const sse = [
    `data: ${JSON.stringify({
      choices: [{ delta: { content: assistantText } }],
    })}`,
    "",
    "data: [DONE]",
    "",
    "",
  ].join("\n");

  await page.route("**/api/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse,
    });
  });
}

/** Mock the complete two-call thinking protocol used by useChatSession. */
export async function mockThinkingChatStream(
  page: Page,
  options: { notes?: string; answer?: string } = {},
) {
  const notes =
    options.notes ??
    "The user asked for a concise explanation. Cover the definition, one example, and an important caveat.";
  const answer =
    options.answer ??
    "Reinforcement learning is a way for an agent to learn by taking actions, receiving rewards, and improving its strategy over time.";

  await page.route("**/api/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const body = route.request().postDataJSON() as { thinkingStage?: string };
    const text = body.thinkingStage === "thinking" ? notes : answer;
    const sse = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}`,
      "",
      "data: [DONE]",
      "",
      "",
    ].join("\n");
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse,
    });
  });
}
