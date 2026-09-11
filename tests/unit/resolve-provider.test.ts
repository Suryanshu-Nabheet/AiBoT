/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import {
  findProviderForModel,
  isPlatformModel,
  resolveProviderRoute,
} from "@/lib/chat/resolve-provider";
import { MODELS } from "@/lib/types";

describe("findProviderForModel", () => {
  it("maps OpenAI BYOK model ids", () => {
    expect(findProviderForModel("gpt-4.1")).toBe("openai");
  });

  it("maps OpenRouter slugs", () => {
    expect(findProviderForModel("openai/gpt-4.1")).toBe("openrouter");
  });

  it("returns null for unknown ids", () => {
    expect(findProviderForModel("unknown-model-xyz")).toBeNull();
  });
});

describe("isPlatformModel", () => {
  it("recognizes built-in platform catalog", () => {
    const first = MODELS[0]?.id;
    expect(first).toBeTruthy();
    expect(isPlatformModel(first!)).toBe(true);
  });
});

describe("resolveProviderRoute", () => {
  const platform = { siteUrl: "https://aibot.test", siteName: "AiBoT" };

  it("routes OpenAI key to OpenAI API", () => {
    const route = resolveProviderRoute(
      "gpt-4o",
      { openai: "sk-test" },
      platform,
    );
    expect(route.kind).toBe("openai-compatible");
    expect(route.url).toContain("api.openai.com");
    expect(route.model).toBe("gpt-4o");
  });

  it("routes Anthropic key to messages API", () => {
    const route = resolveProviderRoute(
      "claude-3-5-sonnet-20241022",
      { anthropic: "sk-ant-test" },
      platform,
    );
    expect(route.kind).toBe("anthropic");
    expect(route.url).toContain("anthropic.com");
  });

  it("falls back to OpenRouter when no BYOK match", () => {
    const route = resolveProviderRoute(
      "openrouter/free",
      {},
      {
        ...platform,
        openRouterKey: "sk-or-test",
      },
    );
    expect(route.url).toContain("openrouter.ai");
  });
});
