/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import {
  inferChatKeySource,
  type ChatKeySource,
} from "@/lib/chat/chat-key-context";
import type { CustomKeys } from "@/lib/chat/resolve-provider";
import { translate, type Locale } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/dictionaries/en";

export type ChatErrorCode =
  | "rate_limit"
  | "byok_key_required"
  | "byok_invalid_key"
  | "invalid_model"
  | "platform_unavailable"
  | "validation"
  | "upstream"
  | "ollama"
  | "network"
  | "generic";

const TITLE_KEYS: Record<ChatErrorCode, TranslationKey> = {
  rate_limit: "errors.chat.title.rateLimit",
  byok_key_required: "errors.chat.title.byokKeyRequired",
  byok_invalid_key: "errors.chat.title.byokInvalidKey",
  invalid_model: "errors.chat.title.invalidModel",
  platform_unavailable: "errors.chat.title.platformUnavailable",
  validation: "errors.chat.title.validation",
  upstream: "errors.chat.title.upstream",
  ollama: "errors.chat.title.ollama",
  network: "errors.chat.title.network",
  generic: "errors.chat.title.generic",
};

const BODY_KEYS: Record<ChatErrorCode, TranslationKey> = {
  rate_limit: "errors.chat.body.rateLimit",
  byok_key_required: "errors.chat.body.byokKeyRequired",
  byok_invalid_key: "errors.chat.body.byokInvalidKey",
  invalid_model: "errors.chat.body.invalidModel",
  platform_unavailable: "errors.chat.body.platformUnavailable",
  validation: "errors.chat.body.validation",
  upstream: "errors.chat.body.upstream",
  ollama: "errors.chat.body.ollama",
  network: "errors.chat.body.network",
  generic: "errors.chat.body.generic",
};

export type ParsedChatErrorPayload = {
  code?: string;
  message?: string;
  keySource?: ChatKeySource;
};

export type ChatErrorResolveContext = {
  modelId?: string;
  customKeys?: CustomKeys;
  keySource?: ChatKeySource;
};

function resolveKeySource(ctx?: ChatErrorResolveContext): ChatKeySource {
  if (ctx?.keySource) return ctx.keySource;
  if (ctx?.modelId) return inferChatKeySource(ctx.modelId, ctx.customKeys);
  return "byok";
}

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
        keySource:
          parsed.keySource === "platform" || parsed.keySource === "byok"
            ? parsed.keySource
            : undefined,
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
      keySource:
        parsed.keySource === "platform" || parsed.keySource === "byok"
          ? parsed.keySource
          : undefined,
    };
  } catch {
    return { message: trimmed };
  }
}

function isKnownCode(value: string): value is ChatErrorCode {
  return value in TITLE_KEYS;
}

function isInvalidModelMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("model not found") ||
    lower.includes("does not exist") ||
    lower.includes("invalid model") ||
    lower.includes("unknown model") ||
    lower.includes("no endpoints found") ||
    lower.includes("not a valid model")
  );
}

function mapLegacyCode(code: string): ChatErrorCode | undefined {
  if (code === "missing_api_key") return "byok_key_required";
  if (code === "auth") return "byok_invalid_key";
  return undefined;
}

function applyKeySource(
  code: ChatErrorCode,
  status: number,
  message: string,
  ctx?: ChatErrorResolveContext,
): ChatErrorCode {
  if (isInvalidModelMessage(message)) return "invalid_model";

  const platform = resolveKeySource(ctx) === "platform";

  if (code === "byok_key_required") {
    return platform ? "platform_unavailable" : "byok_key_required";
  }
  if (code === "byok_invalid_key") {
    return platform ? "platform_unavailable" : "byok_invalid_key";
  }
  if (code === "platform_unavailable") return "platform_unavailable";

  if (status === 401 || status === 403) {
    const lower = message.toLowerCase();
    if (
      lower.includes("api key") ||
      lower.includes("unauthorized") ||
      lower.includes("authentication") ||
      lower.includes("invalid bearer")
    ) {
      return platform ? "platform_unavailable" : "byok_invalid_key";
    }
  }

  return code;
}

function classifyFromStatusAndText(
  status: number,
  message: string,
): ChatErrorCode {
  const lower = message.toLowerCase();

  if (isInvalidModelMessage(message)) return "invalid_model";

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
    return "byok_key_required";
  }

  if (status === 401 || status === 403) {
    if (
      lower.includes("api key") ||
      lower.includes("unauthorized") ||
      lower.includes("authentication")
    ) {
      return "byok_invalid_key";
    }
    return "byok_invalid_key";
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
  ctx?: ChatErrorResolveContext,
): ChatErrorCode {
  const payload = parseChatErrorPayload(rawBody ?? "");
  const mergedCtx: ChatErrorResolveContext = {
    ...ctx,
    keySource: payload.keySource ?? ctx?.keySource,
  };

  if (explicitCode && isKnownCode(explicitCode)) {
    return applyKeySource(
      explicitCode,
      status,
      payload.message ?? rawBody ?? "",
      mergedCtx,
    );
  }

  if (payload.code) {
    if (isKnownCode(payload.code)) {
      return applyKeySource(
        payload.code,
        status,
        payload.message ?? rawBody ?? "",
        mergedCtx,
      );
    }
    const legacy = mapLegacyCode(payload.code);
    if (legacy) {
      return applyKeySource(
        legacy,
        status,
        payload.message ?? rawBody ?? "",
        mergedCtx,
      );
    }
    if (payload.code === "429") return "rate_limit";
    if (payload.code === "401" || payload.code === "403") {
      return applyKeySource(
        "byok_invalid_key",
        status,
        payload.message ?? rawBody ?? "",
        mergedCtx,
      );
    }
  }

  const text = payload.message ?? rawBody ?? "";
  const base = classifyFromStatusAndText(status, text);
  return applyKeySource(base, status, text, mergedCtx);
}

export function resolveChatError(
  locale: Locale,
  status: number,
  rawBody?: string,
  explicitCode?: ChatErrorCode,
  ctx?: ChatErrorResolveContext,
): { code: ChatErrorCode; title: string; body: string } {
  const code = inferChatErrorCode(status, rawBody, explicitCode, ctx);
  return {
    code,
    title: translate(locale, TITLE_KEYS[code]),
    body: translate(locale, BODY_KEYS[code]),
  };
}

/** JSON body for API routes — client maps `code` + `keySource` to localized UI. */
export function chatErrorResponseBody(
  status: number,
  rawUpstream?: string,
  explicitCode?: ChatErrorCode,
  modelId?: string,
  customKeys?: CustomKeys,
): { code: ChatErrorCode; message: string; keySource: ChatKeySource } {
  const keySource = inferChatKeySource(modelId ?? "", customKeys);
  const ctx: ChatErrorResolveContext = { modelId, customKeys, keySource };
  const code = inferChatErrorCode(status, rawUpstream, explicitCode, ctx);
  return {
    code,
    message: translate("en", BODY_KEYS[code]),
    keySource,
  };
}
