/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";

test.describe("Mobile sidebar", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opening sidebar does not focus the search field", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /toggle sidebar/i }).click();

    const search = page.getByPlaceholder(/search chats/i);
    await expect(search).toBeVisible();

    const activeTag = await page.evaluate(() =>
      document.activeElement?.getAttribute("placeholder"),
    );
    expect(activeTag).not.toMatch(/search chats/i);
  });
});
