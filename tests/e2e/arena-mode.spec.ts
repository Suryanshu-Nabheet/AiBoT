/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";

async function openArenaMode(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("aibot_view_mode", "side-by-side");
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("arena-empty-models")).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("Arena mode settings", () => {
  test("layout switch opens empty arena", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("header")
      .getByRole("button", { name: /^settings$/i })
      .click();
    await page.getByRole("button", { name: /arena mode/i }).click();
    await expect(page.getByTestId("arena-empty-models")).toBeVisible({
      timeout: 30_000,
    });
  });
});

test.describe("Arena mode", () => {
  test("empty arena matches direct chat layout with per-panel model toggles", async ({
    page,
  }) => {
    await openArenaMode(page);

    await expect(
      page.getByText(/what can i help you with today/i),
    ).toBeVisible();

    const modelRow = page.getByTestId("arena-empty-models");
    await expect(modelRow.getByRole("combobox")).toHaveCount(2);
    await expect(page.locator("main").getByText(/^options$/i)).toHaveCount(0);

    const composer = page.locator("main").getByPlaceholder(/message aibot/i);
    await expect(composer).toBeVisible();
    await expect(composer).toBeEditable();
  });
});
