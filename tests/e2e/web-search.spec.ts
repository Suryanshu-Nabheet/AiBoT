/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";
import { mockChatStream, mockWebSearchApi } from "./helpers/mock-chat";

test.describe("Web search mode", () => {
  test("renders answer links as clean source previews with or without search", async ({
    page,
  }) => {
    await mockChatStream(
      page,
      "Read ([the documentation](https://docs.example.com/guide)). Or https://example.org/path.",
    );

    await page.goto("/");
    await page.getByPlaceholder(/message aibot/i).fill("Share useful links");
    await page.getByRole("button", { name: /send message/i }).click();

    const links = page.locator('a[data-source-link="inline"]');
    await expect(links).toHaveCount(2, { timeout: 15_000 });
    await expect(links.nth(0)).toHaveAttribute(
      "href",
      "https://docs.example.com/guide",
    );
    await expect(links.nth(0)).toContainText("the documentation");
    await expect(links.nth(1)).toContainText("example.org");
    await expect(links.first().locator("xpath=ancestor::p")).toHaveText(
      "Read the documentation·docs.example.com. Or example.org.",
    );
  });

  test("does not search for a greeting when web search is enabled", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_web_search_enabled", "true");
    });
    await mockWebSearchApi(page);
    await mockChatStream(page, "Hello! How can I help you today?");

    let webSearchRequests = 0;
    page.on("request", (request) => {
      if (
        request.url().includes("/api/web-search") &&
        request.method() === "POST"
      ) {
        webSearchRequests += 1;
      }
    });

    await page.goto("/");
    await page.getByPlaceholder(/message aibot/i).fill("hi");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(
      page.getByText(/hello! how can i help you today/i),
    ).toBeVisible({
      timeout: 15_000,
    });
    expect(webSearchRequests).toBe(0);
  });

  test("cancels a pending Web search approval without sending a chat request", async ({
    page,
  }) => {
    let chatRequests = 0;
    let webSearchRequests = 0;
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() === "POST") chatRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: [
          `data: ${JSON.stringify({ choices: [{ delta: { content: "Hello!" } }] })}`,
          "",
          "data: [DONE]",
          "",
          "",
        ].join("\n"),
      });
    });
    await page.route("**/api/web-search", async (route) => {
      if (route.request().method() === "POST") webSearchRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ batches: [] }),
      });
    });

    await page.goto("/");
    await page
      .getByPlaceholder(/message aibot/i)
      .fill("What are the latest OpenAI Sora updates?");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(
      page.getByRole("button", { name: /search web/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /stop generating/i }).click();
    await expect(page.getByRole("button", { name: /search web/i })).toHaveCount(
      0,
    );
    await expect(page.getByText(/web search requested/i)).toHaveCount(0);

    await page.getByPlaceholder(/send follow-up/i).fill("hi");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.getByText("Hello!")).toBeVisible({ timeout: 15_000 });
    expect(chatRequests).toBe(1);
    expect(webSearchRequests).toBe(0);
  });

  test("keeps search evidence in both Thinking stages", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_web_search_enabled", "true");
      localStorage.setItem("aibot_thinking_enabled", "true");
    });
    await mockWebSearchApi(page);

    const chatBodies: {
      thinkingStage?: string;
      messages?: { role: string; content: unknown }[];
    }[] = [];
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      const body = route
        .request()
        .postDataJSON() as (typeof chatBodies)[number];
      chatBodies.push(body);
      const responseText =
        body.thinkingStage === "thinking"
          ? "I’ll verify Region X’s latest update against the supplied source and note any gaps."
          : "Region X's update takes effect this week ([source](https://example.com/news/region-x)).";
      const sse = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: responseText } }] })}`,
        "",
        "data: [DONE]",
        "",
        "",
      ].join("\n");
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse,
      });
    });

    await page.goto("/");
    await page
      .getByPlaceholder(/message aibot/i)
      .fill("latest news about Region X");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText(/region x's update takes effect/i)).toBeVisible(
      {
        timeout: 15_000,
      },
    );
    expect(chatBodies.map((body) => body.thinkingStage)).toEqual([
      "thinking",
      "final",
    ]);
    for (const body of chatBodies) {
      const userMessage = body.messages?.find(
        (message) => message.role === "user",
      );
      const content =
        typeof userMessage?.content === "string"
          ? userMessage.content
          : JSON.stringify(userMessage?.content ?? "");
      if (body.thinkingStage === "thinking") {
        expect(content).not.toContain("WEB SEARCH EVIDENCE");
      } else {
        expect(content).toContain("WEB SEARCH EVIDENCE");
        expect(content).toContain("Official update published today");
        expect(content).toContain("https://example.com/news/region-x");
      }
    }

    const thinkingToggle = page.getByRole("button", { name: /thinking/i });
    await expect(thinkingToggle).toBeVisible();
    await thinkingToggle.click();
    await expect(
      page.getByText(/I’ll verify Region X’s latest update/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Request:|Approach:|Evidence:|Uncertainty:/i),
    ).toHaveCount(0);
  });

  test("can search after the Thinking plan and include evidence in the answer stage", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_web_search_enabled", "true");
      localStorage.setItem("aibot_thinking_enabled", "true");
    });

    const events: string[] = [];
    const chatBodies: { thinkingStage?: string; messages?: unknown[] }[] = [];
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      const body = route
        .request()
        .postDataJSON() as (typeof chatBodies)[number];
      chatBodies.push(body);
      const stage = body.thinkingStage;
      events.push(stage === "thinking" ? "thinking" : "final");
      const text =
        stage === "thinking"
          ? "I’ll verify the current official documentation and release notes before comparing these tools."
          : "The official documentation supports this comparison.";
      const sse = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}`,
        "",
        "data: [DONE]",
        "",
        "",
      ].join("\n");
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse,
      });
    });
    await page.route("**/api/web-search", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      events.push("search");
      const body = route.request().postDataJSON() as { query?: string };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          batches: [
            {
              query: body.query ?? "Alpha and Beta current documentation",
              results: [
                {
                  title: "Official Comparison",
                  href: "https://docs.example.com/compare",
                  domain: "docs.example.com",
                  brand: "generic",
                  snippet: "Official documentation comparison evidence.",
                },
              ],
            },
          ],
        }),
      });
    });

    await page.goto("/");
    await page
      .getByPlaceholder(/message aibot/i)
      .fill("Compare Alpha and Beta using the descriptions I provided.");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(
      page.getByText("The official documentation supports this comparison."),
    ).toBeVisible({ timeout: 15_000 });

    expect(events).toEqual(["thinking", "search", "final"]);
    const finalRequest = chatBodies.at(-1);
    const userMessage = finalRequest?.messages?.find(
      (message) =>
        typeof message === "object" &&
        message !== null &&
        "role" in message &&
        message.role === "user",
    ) as { content?: unknown } | undefined;
    const content =
      typeof userMessage?.content === "string"
        ? userMessage.content
        : JSON.stringify(userMessage?.content ?? "");
    expect(content).toContain("WEB SEARCH EVIDENCE");
    expect(content).toContain("Official documentation comparison evidence.");
    await page.getByRole("button", { name: /thinking/i }).click();
    await expect(
      page.getByText(
        /I found 1 relevant source and will use the relevant evidence/i,
      ),
    ).toBeVisible();
  });

  test("keeps a Thinking-triggered search request open until the user approves", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_web_search_enabled", "false");
      localStorage.setItem("aibot_thinking_enabled", "true");
    });

    const events: string[] = [];
    const chatBodies: { thinkingStage?: string; messages?: unknown[] }[] = [];
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      const body = route
        .request()
        .postDataJSON() as (typeof chatBodies)[number];
      chatBodies.push(body);
      const stage = body.thinkingStage;
      events.push(stage === "thinking" ? "thinking" : "final");
      const text =
        stage === "thinking"
          ? "I’ll verify the current official documentation for these options before comparing them."
          : "I found no current sources, so this comparison is limited to the details provided.";
      const sse = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}`,
        "",
        "data: [DONE]",
        "",
        "",
      ].join("\n");
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse,
      });
    });
    await page.route("**/api/web-search", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      events.push("search");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ batches: [] }),
      });
    });

    await page.goto("/");
    await page
      .getByPlaceholder(/message aibot/i)
      .fill("Compare Alpha and Beta using the descriptions I provided.");
    await page.getByRole("button", { name: /send message/i }).click();

    const searchButton = page.getByRole("button", { name: /search web/i });
    await expect(searchButton).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(5_200);
    await expect(searchButton).toBeVisible();
    await searchButton.click();
    await expect(
      page.getByText(/this comparison is limited to the details provided/i),
    ).toBeVisible({ timeout: 15_000 });

    expect(events).toEqual(["thinking", "search", "final"]);
    const finalUserMessage = chatBodies
      .at(-1)
      ?.messages?.find(
        (message) =>
          typeof message === "object" &&
          message !== null &&
          "role" in message &&
          message.role === "user",
      ) as { content?: unknown } | undefined;
    const content =
      typeof finalUserMessage?.content === "string"
        ? finalUserMessage.content
        : JSON.stringify(finalUserMessage?.content ?? "");
    expect(content).toContain("no sufficiently relevant sources");
  });

  test("sends the original request for server-side focused query planning", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_web_search_enabled", "true");
    });
    await mockChatStream(page, "I found the relevant framework details.");

    let searchRequest = "";
    let submittedUserMessage = "";
    page.on("request", (request) => {
      if (!request.url().includes("/api/chat") || request.method() !== "POST") {
        return;
      }
      const body = request.postDataJSON() as {
        messages?: { role: string; content: unknown }[];
      };
      const userMessage = body.messages?.find(
        (message) => message.role === "user",
      );
      submittedUserMessage =
        typeof userMessage?.content === "string"
          ? userMessage.content
          : JSON.stringify(userMessage?.content ?? "");
    });
    await page.route("**/api/web-search", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      searchRequest =
        (route.request().postDataJSON() as { query?: string }).query ?? "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ batches: [] }),
      });
    });

    const prompt =
      "Please use web search to research the latest AI agent frameworks and compare Vercel AI SDK with LangGraph, then write a comprehensive recommendation report with code samples, citations, and a conclusion. Focus on the factual differences.";
    await page.goto("/");
    await page.getByPlaceholder(/message aibot/i).fill(prompt);
    await page.getByRole("button", { name: /send message/i }).click();
    await page.getByRole("button", { name: /continue without/i }).click();
    await expect(
      page.getByText("I found the relevant framework details."),
    ).toBeVisible({ timeout: 15_000 });

    expect(searchRequest).toBe(prompt);
    expect(submittedUserMessage).toContain(prompt);
  });

  test("appends web search context to the user message and shows sources", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_web_search_enabled", "true");
    });
    await mockWebSearchApi(page);
    await mockChatStream(
      page,
      "Summary grounded in search results: [Example News — Region X](https://example.com/news/region-x).",
    );

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
    await expect(
      page.getByTestId("web-search-trace").getByText(/example news/i),
    ).toBeVisible();
    await expect(
      page.locator('[data-source-link="row"]').filter({
        hasText: "Example News — Region X",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/summary grounded in search results/i),
    ).toBeVisible({ timeout: 15_000 });
    const citation = page.locator(
      'a[data-source-link="inline"][title^="Example News"][href="https://example.com/news/region-x"]',
    );
    await expect(citation).toContainText("Example News");
    await expect(citation).toContainText("example.com");
    await expect(citation).toHaveAttribute("target", "_blank");

    expect(chatBodies.length).toBeGreaterThan(0);
    const last = chatBodies.at(-1);
    const userMessage = last?.messages?.find((m) => m.role === "user");
    const content =
      typeof userMessage?.content === "string"
        ? userMessage.content
        : JSON.stringify(userMessage?.content ?? "");

    expect(content).toContain("WEB SEARCH EVIDENCE");
    expect(content).toContain("Official update published today");
    expect(content).toContain("latest news about Region X");
    expect(content.indexOf("latest news about Region X")).toBeLessThan(
      content.indexOf("WEB SEARCH EVIDENCE"),
    );
  });

  test("shows inline search confirmation bar when web search is off and user asks for search", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_web_search_enabled", "false");
    });
    await mockWebSearchApi(page);
    await mockChatStream(
      page,
      "Suryanshu Nabheet is the founder and creator of AiBoT.",
    );

    await page.goto("/");
    const composer = page.getByPlaceholder(/message aibot/i);
    await composer.fill(
      "find more info of your founder do web search and get more context",
    );
    await page.getByRole("button", { name: /send message/i }).click();

    // Verify the sleek interactive bar appears
    const searchWebBtn = page.getByRole("button", { name: /search web/i });
    await expect(searchWebBtn).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/web search requested/i)).toBeVisible();
    await page.waitForTimeout(5_200);
    await expect(searchWebBtn).toBeVisible();

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
