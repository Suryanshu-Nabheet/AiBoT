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
