/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";
import { mockChatStream } from "./helpers/mock-chat";

test.describe("Chat layout after first message", () => {
  test("composer moves to thread mode with user bubble", async ({ page }) => {
    await mockChatStream(page);
    await page.goto("/");

    const composer = page.getByPlaceholder(/message aibot/i);
    await composer.click();
    await page.keyboard.type("ping");
    const send = page.getByRole("button", { name: /send message/i });
    await expect(send).toBeEnabled({ timeout: 5_000 });
    await send.click();

    await expect(
      page.locator("main").getByText("ping", { exact: true }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(composer).toBeVisible();
    await expect(page.getByText(/what can i help you with today/i)).toHaveCount(
      0,
    );
  });
});
