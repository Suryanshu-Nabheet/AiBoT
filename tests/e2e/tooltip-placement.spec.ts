/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";

test.describe("Header tooltip placement", () => {
  test("sidebar toggle tooltip does not overlap the adjacent search button", async ({
    page,
  }) => {
    await page.goto("/");

    const toggle = page.getByRole("button", { name: /toggle sidebar/i });
    const search = page.getByRole("button", { name: /search chats/i });
    await toggle.hover();

    const tooltip = page.getByText("Toggle sidebar (⌘B)", { exact: true });
    await expect(tooltip).toBeVisible();

    const [tooltipBox, searchBox] = await Promise.all([
      tooltip.boundingBox(),
      search.boundingBox(),
    ]);
    expect(tooltipBox && searchBox).toBeTruthy();
    if (tooltipBox && searchBox) {
      const overlaps =
        tooltipBox.x < searchBox.x + searchBox.width &&
        tooltipBox.x + tooltipBox.width > searchBox.x &&
        tooltipBox.y < searchBox.y + searchBox.height &&
        tooltipBox.y + tooltipBox.height > searchBox.y;
      expect(overlaps).toBe(false);
    }

    await search.hover();
    await expect(
      page.getByText("Search chats...", { exact: true }),
    ).toBeVisible();
  });
});
