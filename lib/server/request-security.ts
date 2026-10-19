/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  scope: string;
};

type RateLimitEntry = { count: number; resetAt: number };

const rateLimits = new Map<string, RateLimitEntry>();

function getClientId(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isSameOriginOrAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host.toLowerCase();

    const forwardedHost = request.headers.get("x-forwarded-host");
    const hostHeader = request.headers.get("host");
    const nextUrlHost = request.nextUrl.host;

    const candidateHosts = [
      forwardedHost?.split(",")[0]?.trim(),
      hostHeader?.split(",")[0]?.trim(),
      nextUrlHost,
    ]
      .filter((h): h is string => Boolean(h))
      .map((h) => h.toLowerCase());

    if (candidateHosts.some((h) => h === originHost)) {
      return true;
    }

    if (
      originUrl.origin.toLowerCase() === request.nextUrl.origin.toLowerCase()
    ) {
      return true;
    }

    if (process.env.VERCEL_URL) {
      const vercelHost = process.env.VERCEL_URL.replace(/^https?:\/\//, "")
        .split("/")[0]
        .toLowerCase();
      if (originHost === vercelHost) return true;
    }

    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
        if (appUrl.host.toLowerCase() === originHost) return true;
      } catch {
        // Ignore malformed env URL
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Applies a same-origin check and a best-effort, per-instance rate limit.
 * Deployments that scale horizontally should replace this Map with a shared
 * store (for example Redis) while keeping this API boundary intact.
 */
export function protectApiRequest(
  request: NextRequest,
  { limit, windowMs, scope }: RateLimitOptions,
): NextResponse | null {
  if (!isSameOriginOrAllowed(request)) {
    return NextResponse.json(
      { message: "Cross-origin requests are not allowed" },
      { status: 403 },
    );
  }

  const now = Date.now();
  const key = `${scope}:${getClientId(request)}`;
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      {
        code: "rate_limit",
        message: "Too many requests. Please try again shortly.",
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  current.count += 1;
  rateLimits.set(key, current);
  return null;
}
