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
      page.getByText(/the user asked for a concise explanation/i),
    ).toBeVisible();
    await expect(
      page.getByText(/private planning notes|aibot-planning-context/i),
    ).toHaveCount(0);
  });
});
