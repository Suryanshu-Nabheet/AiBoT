/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

export type AttachmentKind = "image" | "document" | "text" | "video_frame";

/** Normalized attachment ready for UI + model APIs. */
export type ChatAttachment = {
  id: string;
  name: string;
  /** MIME type (e.g. image/jpeg, application/pdf, text/plain). */
  type: string;
  kind: AttachmentKind;
  /**
   * Images / video frames: data URL.
   * Documents / text: extracted plain text.
   */
  content: string;
  /** Extra context, e.g. "Frame 3/6 · 0:12 from demo.mp4". */
  note?: string;
};

export type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export const ATTACHMENT_LIMITS = {
  maxFiles: 8,
  maxImages: 6,
  maxVideoFrames: 6,
  maxDocCharsPerFile: 60_000,
  maxDocCharsTotal: 120_000,
  maxImageEdge: 1536,
  jpegQuality: 0.72,
  maxVideoDurationSec: 120,
  maxRawFileBytes: 40 * 1024 * 1024,
} as const;

export const ATTACH_ACCEPT =
  "image/*,video/*,.pdf,.docx,.doc,.txt,.md,.markdown,.json,.csv,.pptx,.xlsx,.xls,.ts,.tsx,.js,.jsx,.py,.java,.go,.rs,.html,.css,.xml,.yaml,.yml";

export function isImageAttachment(a: ChatAttachment) {
  return a.kind === "image" || a.kind === "video_frame";
}

export function isTextualAttachment(a: ChatAttachment) {
  return a.kind === "document" || a.kind === "text";
}

/** Build OpenAI/OpenRouter-compatible user content from text + attachments. */
export function buildMultimodalUserContent(
  text: string,
  attachments: ChatAttachment[] = [],
): string | OpenAIContentPart[] {
  const trimmed = text.trim();
  const images = attachments.filter(isImageAttachment);
  const docs = attachments.filter(isTextualAttachment);

  const docBlocks = docs
    .map((doc) => {
      const header = doc.note
        ? `File: ${doc.name} (${doc.note})`
        : `File: ${doc.name}`;
      return `${header}\n\`\`\`\n${doc.content}\n\`\`\``;
    })
    .join("\n\n");

  const textBody = [docBlocks, trimmed].filter(Boolean).join("\n\n");

  if (images.length === 0) {
    return textBody || trimmed || "(attached files)";
  }

  const parts: OpenAIContentPart[] = [];
  if (textBody) {
    parts.push({ type: "text", text: textBody });
  } else {
    parts.push({
      type: "text",
      text: "Please analyze the attached image(s) / video frame(s).",
    });
  }

  for (const img of images) {
    const label = img.note ? `${img.name} — ${img.note}` : img.name;
    parts.push({ type: "text", text: `[Attachment: ${label}]` });
    parts.push({ type: "image_url", image_url: { url: img.content } });
  }

  return parts;
}

/** Anthropic Messages API content blocks. */
export function toAnthropicMultimodalContent(
  content: string | OpenAIContentPart[] | unknown,
): unknown {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  const blocks: unknown[] = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const p = part as OpenAIContentPart;
    if (p.type === "text" && p.text) {
      blocks.push({ type: "text", text: p.text });
    } else if (p.type === "image_url" && p.image_url?.url) {
      const url = p.image_url.url;
      const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(url);
      if (match) {
        blocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: match[1],
            data: match[2],
          },
        });
      } else {
        blocks.push({
          type: "text",
          text: `[Image URL: ${url.slice(0, 120)}…]`,
        });
      }
    }
  }
  return blocks.length > 0 ? blocks : "";
}

/** Ollama chat: images as base64 list + text content. */
export function toOllamaMessage(
  content: string | OpenAIContentPart[] | unknown,
): {
  content: string;
  images?: string[];
} {
  if (typeof content === "string") return { content };
  if (!Array.isArray(content)) return { content: "" };

  const texts: string[] = [];
  const images: string[] = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const p = part as OpenAIContentPart;
    if (p.type === "text" && p.text) texts.push(p.text);
    if (p.type === "image_url" && p.image_url?.url) {
      const raw = p.image_url.url;
      const b64 = raw.includes(",") ? raw.split(",")[1] : raw;
      if (b64) images.push(b64);
    }
  }
  return {
    content: texts.join("\n\n") || "Please analyze the attached image(s).",
    images: images.length > 0 ? images : undefined,
  };
}

export function normalizeLegacyAttachment(raw: {
  name: string;
  content: string;
  type: string;
  kind?: AttachmentKind;
  note?: string;
  id?: string;
}): ChatAttachment {
  const type = raw.type || "application/octet-stream";
  let kind = raw.kind;
  if (!kind) {
    if (type.startsWith("image/")) kind = "image";
    else if (raw.content.startsWith("data:image/")) kind = "image";
    else kind = "document";
  }
  return {
    id: raw.id || `att-${raw.name}-${Math.random().toString(36).slice(2, 8)}`,
    name: raw.name,
    type,
    kind,
    content: raw.content,
    note: raw.note,
  };
}
