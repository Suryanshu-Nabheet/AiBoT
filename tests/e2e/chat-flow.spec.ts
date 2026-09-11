/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";

test.describe("Chat layout after first message", () => {
  test("composer moves to thread mode with user bubble", async ({ page }) => {
    await page.goto("/");

    const composer = page.getByPlaceholder(/message aibot/i);
    await composer.fill("ping");
    await page.getByRole("button", { name: /send message/i }).click();

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
