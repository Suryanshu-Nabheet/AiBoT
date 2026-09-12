/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import {
  buildMultimodalUserContent,
  toAnthropicMultimodalContent,
  toOllamaMessage,
} from "@/lib/chat/attachments";

describe("buildMultimodalUserContent", () => {
  it("returns plain text when only documents are attached", () => {
    const content = buildMultimodalUserContent("Summarize this", [
      {
        id: "1",
        name: "notes.txt",
        type: "text/plain",
        kind: "text",
        content: "Hello world",
      },
    ]);
    expect(typeof content).toBe("string");
    expect(content).toContain("notes.txt");
    expect(content).toContain("Hello world");
    expect(content).toContain("Summarize this");
  });

  it("builds vision parts for images", () => {
    const dataUrl = "data:image/jpeg;base64,abc123";
    const content = buildMultimodalUserContent("What is this?", [
      {
        id: "1",
        name: "shot.jpg",
        type: "image/jpeg",
        kind: "image",
        content: dataUrl,
      },
    ]);
    expect(Array.isArray(content)).toBe(true);
    if (!Array.isArray(content)) return;
    expect(content.some((p) => p.type === "text")).toBe(true);
    expect(
      content.some(
        (p) => p.type === "image_url" && p.image_url?.url === dataUrl,
      ),
    ).toBe(true);
  });
});

describe("provider adapters", () => {
  it("maps OpenAI parts to Anthropic image blocks", () => {
    const parts = buildMultimodalUserContent("hi", [
      {
        id: "1",
        name: "a.jpg",
        type: "image/jpeg",
        kind: "image",
        content: "data:image/jpeg;base64,Zm9v",
      },
    ]);
    const anthropic = toAnthropicMultimodalContent(parts) as Array<{
      type: string;
      source?: { type: string; media_type: string; data: string };
    }>;
    expect(Array.isArray(anthropic)).toBe(true);
    expect(anthropic.some((b) => b.type === "image")).toBe(true);
    const image = anthropic.find((b) => b.type === "image");
    expect(image?.source?.data).toBe("Zm9v");
  });

  it("maps OpenAI parts to Ollama images", () => {
    const parts = buildMultimodalUserContent("hi", [
      {
        id: "1",
        name: "a.jpg",
        type: "image/jpeg",
        kind: "image",
        content: "data:image/jpeg;base64,Zm9v",
      },
    ]);
    const ollama = toOllamaMessage(parts);
    expect(ollama.images?.[0]).toBe("Zm9v");
    expect(ollama.content).toContain("hi");
  });
});
