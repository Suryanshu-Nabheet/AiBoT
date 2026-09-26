/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";

test.describe("Mobile sidebar", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opening the sidebar does not open the chat search palette", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /toggle sidebar/i }).click();

    await expect(page.getByPlaceholder(/search chats/i)).toHaveCount(0);
    await expect(
      page.getByRole("dialog", { name: /command palette/i }),
    ).toHaveCount(0);
  });
});
