/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";
import { mockThinkingChatStream } from "./helpers/mock-chat";

test.describe("Thinking mode", () => {
  test("compacts long chat history and includes the saved summary in the next model request", async ({
    page,
  }) => {
    const oldMessages = Array.from({ length: 40 }, (_, index) => ({
      id: `old-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      content:
        index === 0
          ? "We decided the dashboard accent must be indigo."
          : `Conversation detail ${index}.`,
    }));
    await page.addInitScript((messages) => {
      localStorage.setItem(
        "conversations",
        JSON.stringify({
          "long-context-chat": {
            id: "long-context-chat",
            title: "Long context",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages,
          },
        }),
      );
    }, oldMessages);

    const requests: {
      contextSummary?: boolean;
      messages?: { role: string; content: unknown }[];
    }[] = [];
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      const body = route.request().postDataJSON() as (typeof requests)[number];
      requests.push(body);
      const content = body.contextSummary
        ? "The user is building a dashboard and chose indigo as its accent. The current chat concerns preserving that decision across long sessions."
        : "The retained dashboard accent is indigo.";
      const sse = [
        `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`,
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

    await page.goto("/chat/long-context-chat");
    const composer = page.getByPlaceholder(/send follow-up/i);
    await composer.fill("What accent did we choose?");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(
      page.getByText("The retained dashboard accent is indigo.").first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage
            .getItem("conversations")
            ?.includes("The user is building a dashboard"),
        ),
      )
      .toBe(true);

    await composer.fill("Remind me of the accent color.");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(
      page.getByText("The retained dashboard accent is indigo.").last(),
    ).toBeVisible({
      timeout: 15_000,
    });

    expect(requests.some((request) => request.contextSummary)).toBe(true);
    const finalChatRequest = requests
      .filter((request) => !request.contextSummary)
      .at(-1);
    const finalUserMessage = finalChatRequest?.messages
      ?.filter((message) => message.role === "user")
      .at(-1);
    const serialized =
      typeof finalUserMessage?.content === "string"
        ? finalUserMessage.content
        : JSON.stringify(finalUserMessage?.content ?? "");
    expect(serialized).toContain("CHAT CONTINUITY SUMMARY");
    expect(serialized).toContain("chose indigo");
    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage.getItem("conversations")?.includes("contextSummary"),
        ),
      )
      .toBe(true);
  });

  test("includes relevant user context saved from a prior session in the model request", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "aibot-shared-chat-memory-v1",
        JSON.stringify([
          {
            id: "prior-react-chat",
            title: "React dashboard",
            updatedAt: new Date().toISOString(),
            messages: [
              "I am building a React dashboard with TypeScript and Tailwind.",
            ],
          },
        ]),
      );
    });

    const chatBodies: { messages?: { role: string; content: unknown }[] }[] =
      [];
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      chatBodies.push(
        route.request().postDataJSON() as (typeof chatBodies)[number],
      );
      const sse = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: "I will continue the dashboard work." } }] })}`,
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
      .fill("Continue the React dashboard we discussed.");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(
      page.getByText(/i will continue the dashboard work/i),
    ).toBeVisible({ timeout: 15_000 });

    const userContent = chatBodies[0]?.messages?.find(
      (message) => message.role === "user",
    )?.content;
    const serialized =
      typeof userContent === "string"
        ? userContent
        : JSON.stringify(userContent ?? "");
    expect(serialized).toContain("CONTEXT FROM OTHER CHATS");
    expect(serialized).toContain(
      "I am building a React dashboard with TypeScript and Tailwind.",
    );
  });

  test("renders planning summary separately from the final answer", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_thinking_enabled", "true");
    });
    await mockThinkingChatStream(page, {
      notes:
        "I’ll explain reinforcement learning in plain language and use an everyday example.",
      answer:
        "Reinforcement learning is a way for an agent to learn by taking actions, receiving rewards, and improving its strategy over time.",
    });
    await page.goto("/");

    const composer = page.getByPlaceholder(/message aibot/i);
    await composer.fill("what is reinforcement learning?");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText(/thinking/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/reinforcement learning is a way/i),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /thinking/i }).click();
    await expect(
      page.getByText(/explain reinforcement learning in plain language/i),
    ).toBeVisible();
    await expect(page.getByText(/I should/i)).toHaveCount(0);
    await expect(
      page.getByText(/private planning notes|aibot-planning-context/i),
    ).toHaveCount(0);
  });

  test("uses the thinking loop for a greeting when thinking mode is enabled", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_thinking_enabled", "true");
    });
    const chatRequests: { thinkingStage?: string }[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/chat") && request.method() === "POST") {
        chatRequests.push(request.postDataJSON() as { thinkingStage?: string });
      }
    });
    await mockThinkingChatStream(page, {
      notes:
        "- Request: The user greeted me.\n- Approach: I should greet them briefly and invite their request.",
      answer: "Hi there! How can I help today?",
    });
    await page.goto("/");

    await page.getByPlaceholder(/message aibot/i).fill("hi");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText(/hi there! how can i help today/i)).toBeVisible(
      {
        timeout: 15_000,
      },
    );
    expect(chatRequests.map((request) => request.thinkingStage)).toEqual([
      "thinking",
      "final",
    ]);
    await expect(page.getByText(/thinking/i).first()).toBeVisible();
  });

  test("keeps identity planning grounded and removes a copied panel from the answer", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("aibot_thinking_enabled", "true");
      localStorage.setItem(
        "aibot-user-guidance-v1",
        JSON.stringify([
          {
            id: "user-name",
            kind: "memory",
            content: "My name is Suryanshu Nabheet.",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      );
    });

    const requests: {
      thinkingStage?: string;
      messages?: { role: string; content: unknown }[];
    }[] = [];
    const leakedPanel = [
      "Thinking Panel",
      "",
      "- Request: Identify the user.",
      "- Approach: Use the user-shared profile detail.",
      "- Evidence: The user's name is Suryanshu Nabheet.",
      "- Uncertainty: None.",
      "",
      "---",
      "",
      "I am Suryanshu Nabheet.",
    ].join("\n");
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      const request = route
        .request()
        .postDataJSON() as (typeof requests)[number];
      requests.push(request);
      const responseText =
        request.thinkingStage === "thinking"
          ? 'The user asked "who am i". I should lead with "Thinking Panel", then cover how it works, key parts, and one real-world use case in the reply.'
          : requests.filter((item) => item.thinkingStage === "final").length ===
              1
            ? leakedPanel
            : "I am Suryanshu Nabheet.";
      const body = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: responseText } }] })}`,
        "",
        "data: [DONE]",
        "",
        "",
      ].join("\n");
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body,
      });
    });

    await page.goto("/");
    await page.getByPlaceholder(/message aibot/i).fill("who am i");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText("I am Suryanshu Nabheet.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Thinking Panel/)).toHaveCount(0);
    await page.getByRole("button", { name: /thinking/i }).click();
    await expect(
      page.getByText(/check the personal details you’ve shared/i),
    ).toBeVisible();
    await expect(page.getByText(/state only what they support/i)).toBeVisible();
    expect(requests.map((request) => request.thinkingStage)).toEqual([
      "thinking",
      "final",
    ]);
    const userContent = requests[0]?.messages?.find(
      (message) => message.role === "user",
    )?.content;
    const serialized =
      typeof userContent === "string"
        ? userContent
        : JSON.stringify(userContent ?? "");
    expect(serialized).toContain("My name is Suryanshu Nabheet.");
  });
});
