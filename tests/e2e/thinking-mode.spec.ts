/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";
import { mockThinkingChatStream } from "./helpers/mock-chat";

test.describe("Thinking mode", () => {
  test("renders planning summary separately from the final answer", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_thinking_enabled", "true");
    });
    await mockThinkingChatStream(page);
    await page.goto("/");

    const composer = page.getByPlaceholder(/message aibot/i);
    await composer.fill("what is reinforcement learning?");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText(/thinking/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/reinforcement learning is a way/i),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/i should give a concise explanation/i),
    ).toBeVisible();
    await expect(
      page.getByText(/private planning notes|aibot-planning-context/i),
    ).toHaveCount(0);
  });

  test("bypasses the thinking loop for a trivial greeting", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_thinking_enabled", "true");
    });
    const chatRequests: { thinkingStage?: string }[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/chat") && request.method() === "POST") {
        chatRequests.push(request.postDataJSON() as { thinkingStage?: string });
      }
    });
    await mockThinkingChatStream(page, {
      answer: "Hi there! How can I help today?",
    });
    await page.goto("/");

    await page.getByPlaceholder(/message aibot/i).fill("hi");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText(/hi there! how can i help today/i)).toBeVisible(
      {
        timeout: 15_000,
      },
    );
    expect(chatRequests).toHaveLength(1);
    expect(chatRequests[0]?.thinkingStage).toBeUndefined();
  });
});
