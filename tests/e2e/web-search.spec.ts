/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";
import { mockChatStream, mockWebSearchApi } from "./helpers/mock-chat";

test.describe("Web search mode", () => {
  test("injects grounded context before the user message and shows sources", async ({
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

    expect(content).toContain("Web search sources");
    expect(content).toContain("Page excerpt:");
    expect(content).toContain("Region X announced new policy");
    expect(content).toContain("latest news about Region X");
    expect(content.indexOf("Web search sources")).toBeLessThan(
      content.indexOf("latest news about Region X"),
    );
  });
});
