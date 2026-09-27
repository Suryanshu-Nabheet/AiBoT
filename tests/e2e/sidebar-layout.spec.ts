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
    const voice = page.getByRole("button", { name: "Voice", exact: true });
    const [newChatBox, voiceBox] = await Promise.all([
      newChat.boundingBox(),
      voice.boundingBox(),
    ]);
    const [newChatIconBox, voiceIconBox] = await Promise.all([
      newChat.locator("span").first().boundingBox(),
      voice.locator("span").first().boundingBox(),
    ]);

    expect(newChatBox && voiceBox).toBeTruthy();
    expect(newChatIconBox && voiceIconBox).toBeTruthy();
    if (newChatBox && voiceBox && newChatIconBox && voiceIconBox) {
      expect(newChatBox.x).toBe(voiceBox.x);
      expect(newChatBox.width).toBe(voiceBox.width);
      expect(newChatBox.height).toBe(voiceBox.height);
      expect(newChatIconBox.x).toBe(voiceIconBox.x);
    }
  });
});
