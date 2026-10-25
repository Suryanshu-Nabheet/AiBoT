/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";

test.describe("Home / empty chat", () => {
  test("shows greeting and centered composer", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText(/what can i help you with today/i),
    ).toBeVisible();

    const composer = page.getByPlaceholder(/message aibot/i);
    await expect(composer).toBeVisible();
    await expect(composer).toBeEditable();
  });

  test("model selector and composer actions follow the draft state", async ({
    page,
  }) => {
    await page.goto("/");

    const modelSelector = page.getByRole("combobox").first();
    await expect(modelSelector).toBeVisible();
    await modelSelector.focus();
    await expect(modelSelector).toHaveClass(/focus-visible:border-transparent/);
    await expect(modelSelector).toHaveClass(/focus-visible:ring-0/);
    await expect(modelSelector).not.toHaveClass(/focus-visible:ring-\[3px\]/);
    const selectorFocusStyle = await modelSelector.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderWidth: style.borderWidth,
        outlineStyle: style.outlineStyle,
      };
    });
    expect(selectorFocusStyle.borderWidth).toBe("0px");
    expect(selectorFocusStyle.outlineStyle).toBe("none");
    await modelSelector.press("Enter");
    await expect(modelSelector).toHaveAttribute("aria-expanded", "true");
    await modelSelector.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await page.mouse.move(0, 0);
    await modelSelector.hover();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await modelSelector.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await page.waitForTimeout(200);
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await page.mouse.move(0, 0);
    await expect(
      page.getByRole("button", { name: /attach files/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /voice input/i }),
    ).toBeVisible();

    const composer = page.getByPlaceholder(/message aibot/i);
    const composerForm = page.getByTestId("chat-composer-form");
    const composerRestStyle = await composerForm.evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderColor: style.borderColor, boxShadow: style.boxShadow };
    });
    await composer.focus();
    const composerFocusedStyle = await composerForm.evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderColor: style.borderColor, boxShadow: style.boxShadow };
    });
    expect(composerFocusedStyle).toEqual(composerRestStyle);
    await expect(composerForm).not.toHaveClass(/focus-within:ring-2/);
    await expect(composerForm).not.toHaveClass(
      /focus-within:border-foreground\/20/,
    );
    await composer.fill("A draft message");
    await expect(
      page.getByRole("button", { name: /send message/i }),
    ).toBeVisible();
  });

  test("restores the selected home model after a page reload", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const localModel = "ollama/qwen3.5:2b";
      localStorage.setItem(
        "aibot_ollama_models",
        JSON.stringify([
          {
            name: "qwen3.5:2b",
            size: 2_741_192_820,
            details: { parameter_size: "2.3B" },
          },
        ]),
      );
      localStorage.setItem(
        "aibot_enabled_models",
        JSON.stringify([localModel]),
      );
    });
    await page.goto("/");

    const modelSelector = page.getByRole("combobox").first();
    await modelSelector.click();
    await page.getByText("qwen3.5:2b", { exact: true }).click();
    await expect(modelSelector).toHaveText(/qwen3.5:2b/);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("directModel")))
      .toBe("ollama/qwen3.5:2b");

    await page.reload();

    await expect(page.getByRole("combobox").first()).toHaveText(/qwen3.5:2b/);
  });

  test("keeps the last model reachable at short and narrow viewport sizes", async ({
    page,
  }) => {
    await page.goto("/");
    const modelSelector = page.getByRole("combobox").first();
    const viewports = [
      { width: 320, height: 280 },
      { width: 390, height: 360 },
      { width: 768, height: 420 },
      { width: 1440, height: 900 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await modelSelector.click();

      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      const menuBounds = await menu.boundingBox();
      expect(menuBounds).not.toBeNull();
      expect(menuBounds!.y).toBeGreaterThanOrEqual(0);
      expect(menuBounds!.x).toBeGreaterThanOrEqual(0);
      expect(menuBounds!.height).toBeLessThanOrEqual(
        Math.min(viewport.height, 600),
      );
      expect(menuBounds!.x + menuBounds!.width).toBeLessThanOrEqual(
        viewport.width,
      );
      expect(menuBounds!.y + menuBounds!.height).toBeLessThanOrEqual(
        viewport.height,
      );

      const lastModel = menu.getByText("Elephant 1", { exact: true });
      await lastModel.scrollIntoViewIfNeeded();
      await expect(lastModel).toBeInViewport();
      const lastModelBounds = await lastModel.boundingBox();
      expect(lastModelBounds).not.toBeNull();
      expect(lastModelBounds!.y).toBeGreaterThanOrEqual(0);
      expect(lastModelBounds!.y + lastModelBounds!.height).toBeLessThanOrEqual(
        viewport.height,
      );
      await page.keyboard.press("Escape");
    }
  });
});
