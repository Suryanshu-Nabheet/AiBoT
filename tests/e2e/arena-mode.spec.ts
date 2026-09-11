/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";

test.describe("Arena mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await page.getByRole("button", { name: /arena mode/i }).click();
  });

  test("empty arena matches direct chat layout with per-panel model toggles", async ({
    page,
  }) => {
    await expect(
      page.getByText(/what can i help you with today/i),
    ).toBeVisible();

    const main = page.locator("main");
    await expect(main.getByRole("combobox")).toHaveCount(2);
    await expect(main.getByText(/^options$/i)).toHaveCount(0);

    const composer = main.getByPlaceholder(/message aibot/i);
    await expect(composer).toBeVisible();
    await expect(composer).toBeEditable();
  });
});
