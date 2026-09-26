/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";

test.describe("Sidebar layout", () => {
  test("navigation actions align and chat history has a Recent heading", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile-chrome",
      "desktop sidebar only",
    );

    await page.goto("/");

    await expect(page.getByText("Recent", { exact: true })).toBeVisible();

    const newChat = page.getByRole("button", { name: "New Chat" });
    const agentMode = page.getByRole("button", { name: "Agent Mode" });
    const [newChatBox, agentModeBox] = await Promise.all([
      newChat.boundingBox(),
      agentMode.boundingBox(),
    ]);
    const [newChatIconBox, agentModeIconBox] = await Promise.all([
      newChat.locator("span").first().boundingBox(),
      agentMode.locator("span").first().boundingBox(),
    ]);

    expect(newChatBox && agentModeBox).toBeTruthy();
    expect(newChatIconBox && agentModeIconBox).toBeTruthy();
    if (newChatBox && agentModeBox && newChatIconBox && agentModeIconBox) {
      expect(newChatBox.x).toBe(agentModeBox.x);
      expect(newChatBox.width).toBe(agentModeBox.width);
      expect(newChatBox.height).toBe(agentModeBox.height);
      expect(newChatIconBox.x).toBe(agentModeIconBox.x);
    }
  });
});
