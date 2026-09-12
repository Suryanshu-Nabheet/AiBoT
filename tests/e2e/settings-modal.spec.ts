/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";

test.describe("Settings modal", () => {
  test("opens over chat and closes without losing the home composer", async ({
    page,
  }) => {
    await page.goto("/");

    const greeting = page.getByText(/what can i help you with today/i);
    await expect(greeting).toBeVisible();

    await page
      .locator("header")
      .getByRole("button", { name: /^settings$/i })
      .click();
    await page.getByRole("menuitem", { name: /app settings/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: /^general$/i }),
    ).toBeVisible();
    await expect(
      dialog.getByText(/language, appearance, and notifications/i),
    ).toBeVisible();

    await dialog.getByRole("button", { name: /close settings/i }).click();
    await expect(dialog).toBeHidden();
    await expect(greeting).toBeVisible();
    await expect(page.getByPlaceholder(/message aibot/i)).toBeEditable();
  });

  test("/settings redirects into the modal on home", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /^general$/i }),
    ).toBeVisible();
  });
});
