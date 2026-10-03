/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";
import { mockChatStream } from "./helpers/mock-chat";

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

  test("active arena pins composer to the bottom of the viewport", async ({
    page,
  }) => {
    await mockChatStream(page, "Arena lane response");
    await openArenaMode(page);
    await page.getByPlaceholder(/message aibot/i).fill("compare models");
    await page.getByRole("button", { name: /send message/i }).click();

    const shell = page.getByTestId("arena-active-shell");
    await expect(shell).toBeVisible({ timeout: 15_000 });

    const composer = page.getByPlaceholder(/send follow-up/i);
    await expect(composer).toBeVisible();

    const shellBox = await shell.boundingBox();
    const composerBox = await composer.boundingBox();
    expect(shellBox).not.toBeNull();
    expect(composerBox).not.toBeNull();
    if (!shellBox || !composerBox) return;

    const composerBottomGap =
      shellBox.y + shellBox.height - composerBox.y - composerBox.height;
    expect(composerBottomGap).toBeLessThan(48);

    const panels = page.getByTestId("arena-panels");
    const panelsBox = await panels.boundingBox();
    expect(panelsBox).not.toBeNull();
    if (!panelsBox) return;

    expect(panelsBox.height).toBeGreaterThan(shellBox.height * 0.45);
  });
});
