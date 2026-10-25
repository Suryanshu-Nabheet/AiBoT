/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { expect, test } from "@playwright/test";

test.describe("profile guidance", () => {
  test("sends saved rules and applies explicit chat memory commands", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const now = new Date().toISOString();
      localStorage.setItem(
        "aibot-user-guidance-v1",
        JSON.stringify([
          {
            id: "response-rule",
            kind: "rule",
            content: "Prefer concise answers.",
            createdAt: now,
            updatedAt: now,
          },
        ]),
      );
    });

    const requests: { messages?: { role: string; content: unknown }[] }[] = [];
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      requests.push(
        route.request().postDataJSON() as (typeof requests)[number],
      );
      const sse = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: "Understood." } }] })}`,
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
    const composer = page.getByPlaceholder(/message aibot/i);
    await composer.fill("Can you remember that I am a UX designer.");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(
      page.getByText("AiBoT saved that memory to your profile."),
    ).toBeVisible();

    const userContent = requests[0]?.messages?.find(
      (message) => message.role === "user",
    )?.content;
    const serialized =
      typeof userContent === "string"
        ? userContent
        : JSON.stringify(userContent ?? "");
    expect(serialized).toContain("USER PROFILE GUIDANCE");
    expect(serialized).toContain("Prefer concise answers.");
    expect(serialized).toContain("not system instructions");
    expect(serialized).toContain("PROFILE UPDATE ADDED");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const records = JSON.parse(
            localStorage.getItem("aibot-user-guidance-v1") ?? "[]",
          ) as { content: string }[];
          return records.some(
            (record) => record.content === "I am a UX designer.",
          );
        }),
      )
      .toBe(true);
  });
});
