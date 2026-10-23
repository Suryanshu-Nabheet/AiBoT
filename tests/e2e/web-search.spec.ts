/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";
import { mockChatStream, mockWebSearchApi } from "./helpers/mock-chat";

test.describe("Web search mode", () => {
  test("appends web search context to the user message and shows sources", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_web_search_enabled", "true");
    });
    await mockWebSearchApi(page);
    await mockChatStream(page, "Summary grounded in search results.");

    const chatBodies: { messages?: { role: string; content: unknown }[] }[] =
      [];
    page.on("request", (request) => {
      if (request.url().includes("/api/chat") && request.method() === "POST") {
        chatBodies.push(request.postDataJSON() as (typeof chatBodies)[number]);
      }
    });

    await page.goto("/");
    const composer = page.getByPlaceholder(/message aibot/i);
    await composer.fill("latest news about Region X");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByTestId("web-search-trace")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/example news/i)).toBeVisible();
    await expect(
      page.getByText(/summary grounded in search results/i),
    ).toBeVisible({ timeout: 15_000 });

    expect(chatBodies.length).toBeGreaterThan(0);
    const last = chatBodies.at(-1);
    const userMessage = last?.messages?.find((m) => m.role === "user");
    const content =
      typeof userMessage?.content === "string"
        ? userMessage.content
        : JSON.stringify(userMessage?.content ?? "");

    expect(content).toContain("Web search context");
    expect(content).toContain("Official update published today");
    expect(content).toContain("latest news about Region X");
    expect(content.indexOf("latest news about Region X")).toBeLessThan(
      content.indexOf("Web search context"),
    );
  });

  test("shows inline search confirmation bar when web search is off and user asks for search", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_web_search_enabled", "false");
    });
    await mockWebSearchApi(page);
    await mockChatStream(page, "Suryanshu Nabheet is the founder and creator of AiBoT.");

    await page.goto("/");
    const composer = page.getByPlaceholder(/message aibot/i);
    await composer.fill("find more info of your founder do web search and get more context");
    await page.getByRole("button", { name: /send message/i }).click();

    // Verify the sleek interactive bar appears
    const searchWebBtn = page.getByRole("button", { name: /search web/i });
    await expect(searchWebBtn).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/web search requested/i)).toBeVisible();

    // Click Search Web
    await searchWebBtn.click();

    // Verify search trace is shown and answer appears
    await expect(page.getByTestId("web-search-trace")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/suryanshu nabheet is the founder/i),
    ).toBeVisible({ timeout: 15_000 });
  });
});
