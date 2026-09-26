/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";

test.describe("Home / empty chat", () => {
  test("shows greeting and centered composer", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText(/what can i help you with today/i),
    ).toBeVisible();

    const composer = page.getByPlaceholder(/message aibot/i);
    await expect(composer).toBeVisible();
    await expect(composer).toBeEditable();
  });

  test("model selector and composer actions follow the draft state", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("combobox").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /attach files/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /voice input/i }),
    ).toBeVisible();

    const composer = page.getByPlaceholder(/message aibot/i);
    await composer.fill("A draft message");
    await expect(
      page.getByRole("button", { name: /send message/i }),
    ).toBeVisible();
  });
});
