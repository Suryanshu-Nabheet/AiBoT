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

  test("mobile close control sits with the Settings title", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "mobile layout only");

    await page.goto("/");
    await page
      .locator("header")
      .getByRole("button", { name: /^settings$/i })
      .click();
    await page.getByRole("menuitem", { name: /app settings/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const chrome = dialog.getByTestId("settings-chrome-header");
    const title = chrome.getByText(/^settings$/i);
    const close = chrome.getByRole("button", { name: /close settings/i });
    await expect(title).toBeVisible();
    await expect(close).toBeVisible();

    const titleBox = await title.boundingBox();
    const closeBox = await close.boundingBox();
    expect(titleBox && closeBox).toBeTruthy();
    if (titleBox && closeBox) {
      // Same header row: close aligns with Settings, not a section chrome bar.
      expect(Math.abs(titleBox.y - closeBox.y)).toBeLessThan(16);
      expect(closeBox.x).toBeGreaterThan(titleBox.x);
    }

    await dialog.getByRole("button", { name: /close settings/i }).click();
    await expect(dialog).toBeHidden();
  });
});
