/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import { protectApiRequest } from "@/lib/server/request-security";
import { keyVerificationSchema } from "@/lib/server/request-schemas";

type Provider = "openai" | "anthropic" | "google" | "deepseek" | "openrouter";

async function verifyOpenAICompatible(
  baseUrl: string,
  key: string,
  extraHeaders?: Record<string, string>,
): Promise<{ ok: boolean; detail?: string }> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      ...extraHeaders,
    },
  });
  if (res.ok) return { ok: true };
  const text = await res.text().catch(() => "");
  return { ok: false, detail: text.slice(0, 200) || `HTTP ${res.status}` };
}

async function verifyAnthropic(
  key: string,
): Promise<{ ok: boolean; detail?: string }> {
  // Lightweight authenticated probe — empty messages returns 400 with valid key, 401 with bad key.
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  if (res.status === 401 || res.status === 403) {
    return { ok: false, detail: "Unauthorized" };
  }
  // 200 or validation/rate errors still prove the key is accepted.
  if (res.status === 200 || res.status === 400 || res.status === 429) {
    return { ok: true };
  }
  const text = await res.text().catch(() => "");
  return { ok: false, detail: text.slice(0, 200) || `HTTP ${res.status}` };
}

async function verifyGoogle(
  key: string,
): Promise<{ ok: boolean; detail?: string }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    { method: "GET" },
  );
  if (res.ok) return { ok: true };
  const text = await res.text().catch(() => "");
  return { ok: false, detail: text.slice(0, 200) || `HTTP ${res.status}` };
}

export async function POST(req: NextRequest) {
  const blocked = protectApiRequest(req, {
    scope: "key-verification",
    limit: 5,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = keyVerificationSchema.safeParse(rawBody);
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, message: "Invalid provider or key" },
      { status: 400 },
    );
  const { provider, key } = parsed.data;

  try {
    let result: { ok: boolean; detail?: string };

    switch (provider) {
      case "openai":
        result = await verifyOpenAICompatible("https://api.openai.com/v1", key);
        break;
      case "deepseek":
        result = await verifyOpenAICompatible("https://api.deepseek.com", key);
        break;
      case "openrouter":
        result = await verifyOpenAICompatible(
          "https://openrouter.ai/api/v1",
          key,
          {
            "HTTP-Referer":
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "AiBoT",
          },
        );
        break;
      case "anthropic":
        result = await verifyAnthropic(key);
        break;
      case "google":
        result = await verifyGoogle(key);
        break;
      default:
        return NextResponse.json(
          { ok: false, message: "Unknown provider" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      ok: result.ok,
      message: result.ok
        ? "Key verified"
        : result.detail || "Verification failed",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: String(error) },
      { status: 500 },
    );
  }
}
