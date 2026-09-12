/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { translate, type Locale } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/dictionaries/en";

export type ChatErrorCode =
  | "rate_limit"
  | "missing_api_key"
  | "auth"
  | "validation"
  | "upstream"
  | "ollama"
  | "network"
  | "generic";

const TITLE_KEYS: Record<ChatErrorCode, TranslationKey> = {
  rate_limit: "errors.chat.title.rateLimit",
  missing_api_key: "errors.chat.title.missingApiKey",
  auth: "errors.chat.title.auth",
  validation: "errors.chat.title.validation",
  upstream: "errors.chat.title.upstream",
  ollama: "errors.chat.title.ollama",
  network: "errors.chat.title.network",
  generic: "errors.chat.title.generic",
};

const BODY_KEYS: Record<ChatErrorCode, TranslationKey> = {
  rate_limit: "errors.chat.body.rateLimit",
  missing_api_key: "errors.chat.body.missingApiKey",
  auth: "errors.chat.body.auth",
  validation: "errors.chat.body.validation",
  upstream: "errors.chat.body.upstream",
  ollama: "errors.chat.body.ollama",
  network: "errors.chat.body.network",
  generic: "errors.chat.body.generic",
};

export type ParsedChatErrorPayload = {
  code?: string;
  message?: string;
};

/** Extract message/code from JSON or plain-text provider bodies. */
export function parseChatErrorPayload(raw: string): ParsedChatErrorPayload {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const nested = parsed.error;
    if (nested && typeof nested === "object" && nested !== null) {
      const err = nested as { message?: string; code?: string | number };
      return {
        code: err.code != null ? String(err.code) : undefined,
        message: err.message ? String(err.message) : undefined,
      };
    }
    return {
      code: parsed.code != null ? String(parsed.code) : undefined,
      message:
        typeof parsed.message === "string"
          ? parsed.message
          : typeof parsed.error === "string"
            ? parsed.error
            : undefined,
    };
  } catch {
    return { message: trimmed };
  }
}

function isKnownCode(value: string): value is ChatErrorCode {
  return value in TITLE_KEYS;
}

function classifyFromStatusAndText(
  status: number,
  message: string,
): ChatErrorCode {
  const lower = message.toLowerCase();

  if (
    status === 429 ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("retry-after")
  ) {
    return "rate_limit";
  }

  if (
    lower.includes("no api key") ||
    lower.includes("api key not configured") ||
    lower.includes("openrouter_api_key") ||
    lower.includes("requires its provider api key") ||
    lower.includes("add a provider key")
  ) {
    return "missing_api_key";
  }

  if (status === 401 || status === 403) {
    if (
      lower.includes("api key") ||
      lower.includes("unauthorized") ||
      lower.includes("authentication")
    ) {
      return "missing_api_key";
    }
    return "auth";
  }

  if (
    status === 400 &&
    (lower.includes("invalid chat") ||
      lower.includes("invalid json") ||
      lower.includes("invalid arena"))
  ) {
    return "validation";
  }

  if (
    lower.includes("ollama") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror")
  ) {
    return status === 0 ? "network" : "ollama";
  }

  if (status === 0 || lower.includes("aborted") || lower.includes("network")) {
    return "network";
  }

  if (status >= 500) return "upstream";

  return "generic";
}

export function inferChatErrorCode(
  status: number,
  rawBody?: string,
  explicitCode?: string,
): ChatErrorCode {
  if (explicitCode && isKnownCode(explicitCode)) {
    return explicitCode;
  }

  const payload = parseChatErrorPayload(rawBody ?? "");
  if (payload.code) {
    if (isKnownCode(payload.code)) return payload.code;
    if (payload.code === "429") return "rate_limit";
    if (payload.code === "401" || payload.code === "403") {
      return "missing_api_key";
    }
  }

  const text = payload.message ?? rawBody ?? "";
  return classifyFromStatusAndText(status, text);
}

export function resolveChatError(
  locale: Locale,
  status: number,
  rawBody?: string,
  explicitCode?: ChatErrorCode,
): { code: ChatErrorCode; title: string; body: string } {
  const code = explicitCode ?? inferChatErrorCode(status, rawBody);
  return {
    code,
    title: translate(locale, TITLE_KEYS[code]),
    body: translate(locale, BODY_KEYS[code]),
  };
}

/** JSON body for API routes — client maps `code` to localized UI. */
export function chatErrorResponseBody(
  status: number,
  rawUpstream?: string,
  explicitCode?: ChatErrorCode,
): { code: ChatErrorCode; message: string } {
  const code = explicitCode ?? inferChatErrorCode(status, rawUpstream);
  return {
    code,
    message: translate("en", BODY_KEYS[code]),
  };
}
