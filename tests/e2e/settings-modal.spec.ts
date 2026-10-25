/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";

test.describe("Settings modal", () => {
  test("lets the user disable and clear browser-local cross-chat memory", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "aibot-shared-chat-memory-v1",
        JSON.stringify([
          {
            id: "saved-chat",
            title: "Saved topic",
            updatedAt: new Date().toISOString(),
            messages: ["A saved user message for the memory settings test."],
          },
        ]),
      );
    });
    await page.goto("/");
    await page
      .locator("header")
      .getByRole("button", { name: /^settings$/i })
      .click();
    await page.getByRole("menuitem", { name: /app settings/i }).click();

    const dialog = page.getByRole("dialog");
    const memoryToggle = dialog.getByRole("switch", {
      name: /cross-chat memory/i,
    });
    await expect(memoryToggle).toBeChecked();
    await expect(dialog.getByText(/1 chats · 1 user messages/i)).toBeVisible();
    await dialog.getByRole("button", { name: /inspect saved memory/i }).click();
    await expect(
      dialog.getByText("A saved user message for the memory settings test."),
    ).toBeVisible();

    await memoryToggle.click();
    await expect(memoryToggle).not.toBeChecked();
    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage.getItem("aibot-shared-chat-memory-enabled"),
        ),
      )
      .toBe("false");

    page.on("dialog", (nativeDialog) => nativeDialog.accept());
    await dialog.getByRole("button", { name: /clear saved memory/i }).click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage.getItem("aibot-shared-chat-memory-v1"),
        ),
      )
      .toBeNull();
    await expect(dialog.getByText(/0 chats · 0 user messages/i)).toBeVisible();
  });

  test("lets the user edit profile memories and response rules", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const now = new Date().toISOString();
      localStorage.setItem(
        "aibot-user-guidance-v1",
        JSON.stringify([
          {
            id: "profile-memory",
            kind: "memory",
            content: "I work on an education app.",
            createdAt: now,
            updatedAt: now,
          },
          {
            id: "profile-rule",
            kind: "rule",
            content: "Prefer concise answers.",
            createdAt: now,
            updatedAt: now,
          },
        ]),
      );
    });
    await page.goto("/");
    await page
      .locator("header")
      .getByRole("button", { name: /^settings$/i })
      .click();
    await page.getByRole("menuitem", { name: /app settings/i }).click();

    const dialog = page.getByRole("dialog");
    const guidance = dialog.getByRole("region", { name: /memories & rules/i });
    await expect(
      guidance.getByText("I work on an education app."),
    ).toBeVisible();
    await guidance.getByRole("button", { name: /edit about me/i }).click();
    const editor = guidance.getByRole("textbox", { name: /edit about me/i });
    await editor.fill("I work on an accessibility education app.");
    await guidance.getByRole("button", { name: /^save$/i }).click();
    await expect(
      guidance.getByText("I work on an accessibility education app."),
    ).toBeVisible();
    await expect(guidance.getByText("Prefer concise answers.")).toBeVisible();

    page.once("dialog", (nativeDialog) => nativeDialog.accept());
    await guidance
      .getByRole("button", { name: /remove how aibot should respond/i })
      .click();
    await expect(guidance.getByText("Prefer concise answers.")).toHaveCount(0);

    await guidance
      .getByRole("switch", { name: /use memories and rules in chats/i })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage.getItem("aibot-user-guidance-enabled"),
        ),
      )
      .toBe("false");
  });

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
    await expect
      .poll(() =>
        dialog.evaluate((element) => getComputedStyle(element).outlineStyle),
      )
      .toBe("none");
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
