/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import {
  BYOK_PROVIDER_IDS,
  getAllByokModels,
  getModelsForProvider,
  PROVIDER_MODELS,
} from "@/lib/provider-models";

describe("provider-models catalog", () => {
  it("lists every BYOK provider", () => {
    expect(BYOK_PROVIDER_IDS).toEqual([
      "openai",
      "anthropic",
      "google",
      "deepseek",
      "openrouter",
    ]);
  });

  it("exposes multiple models per direct provider", () => {
    for (const id of ["openai", "anthropic", "google", "deepseek"] as const) {
      expect(PROVIDER_MODELS[id].length).toBeGreaterThanOrEqual(3);
    }
    expect(PROVIDER_MODELS.openrouter.length).toBeGreaterThanOrEqual(10);
  });

  it("getModelsForProvider returns stable ids", () => {
    const openai = getModelsForProvider("openai");
    expect(openai.every((m) => m.provider === "openai")).toBe(true);
    expect(openai.some((m) => m.id === "gpt-4.1")).toBe(true);
  });

  it("getAllByokModels flattens without duplicates", () => {
    const all = getAllByokModels();
    const ids = all.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns empty array for unknown provider", () => {
    expect(getModelsForProvider("not-a-provider")).toEqual([]);
  });
});
