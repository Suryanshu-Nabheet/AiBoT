/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import {
  ATTACHMENT_LIMITS,
  type ChatAttachment,
  type AttachmentKind,
} from "@/lib/chat/attachments";
import { extractTextFromFile } from "@/lib/file-utils";

export type ProcessFilesResult = {
  attachments: ChatAttachment[];
  errors: string[];
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function truncateText(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n…[truncated — file exceeded ${max.toLocaleString()} characters]`;
}

async function compressImageFile(file: File): Promise<ChatAttachment> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = ATTACHMENT_LIMITS.maxImageEdge;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", ATTACHMENT_LIMITS.jpegQuality);
  return {
    id: newId("img"),
    name: file.name.replace(/\.\w+$/, "") + ".jpg",
    type: "image/jpeg",
    kind: "image",
    content: dataUrl,
  };
}

function loadVideoElement(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => {
      cleanup();
      reject(new Error(`Could not load video ${file.name}`));
    };
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.onerror = () => reject(new Error("Video seek failed"));
    const target = Math.min(
      Math.max(0, time),
      Math.max(0, (video.duration || 1) - 0.05),
    );
    video.currentTime = target;
  });
}

async function extractVideoFrames(file: File): Promise<ChatAttachment[]> {
  const video = await loadVideoElement(file);
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  if (duration <= 0) {
    URL.revokeObjectURL(video.src);
    throw new Error(`Video ${file.name} has no readable duration`);
  }
  if (duration > ATTACHMENT_LIMITS.maxVideoDurationSec) {
    URL.revokeObjectURL(video.src);
    throw new Error(
      `Video ${file.name} is longer than ${ATTACHMENT_LIMITS.maxVideoDurationSec}s — trim it first`,
    );
  }

  const frameCount = Math.min(
    ATTACHMENT_LIMITS.maxVideoFrames,
    Math.max(2, Math.ceil(duration / 8)),
  );
  const canvas = document.createElement("canvas");
  const maxEdge = ATTACHMENT_LIMITS.maxImageEdge;
  const scale = Math.min(
    1,
    maxEdge / Math.max(video.videoWidth || 1, video.videoHeight || 1),
  );
  canvas.width = Math.max(1, Math.round((video.videoWidth || 640) * scale));
  canvas.height = Math.max(1, Math.round((video.videoHeight || 360) * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(video.src);
    throw new Error("Could not prepare video canvas");
  }

  const frames: ChatAttachment[] = [];
  for (let i = 0; i < frameCount; i++) {
    const t =
      frameCount === 1 ? duration / 2 : (duration * i) / (frameCount - 1);
    await seekVideo(video, t);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL(
      "image/jpeg",
      ATTACHMENT_LIMITS.jpegQuality,
    );
    const mm = Math.floor(t / 60);
    const ss = Math.floor(t % 60)
      .toString()
      .padStart(2, "0");
    frames.push({
      id: newId("vframe"),
      name: `${file.name} · frame ${i + 1}`,
      type: "image/jpeg",
      kind: "video_frame",
      content: dataUrl,
      note: `Frame ${i + 1}/${frameCount} at ${mm}:${ss} from ${file.name}`,
    });
  }

  URL.revokeObjectURL(video.src);
  return frames;
}

function guessTextKind(file: File): AttachmentKind {
  const lower = file.name.toLowerCase();
  if (
    lower.endsWith(".pdf") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc")
  ) {
    return "document";
  }
  return "text";
}

async function processDocumentOrText(file: File): Promise<ChatAttachment> {
  const lower = file.name.toLowerCase();
  const needsExtract =
    lower.endsWith(".pdf") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc") ||
    lower.endsWith(".pptx") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls");

  let text: string;
  if (needsExtract) {
    text = await extractTextFromFile(file);
  } else {
    text = await file.text();
  }

  text = truncateText(text, ATTACHMENT_LIMITS.maxDocCharsPerFile);
  if (!text.trim()) {
    throw new Error(`${file.name} had no extractable text`);
  }

  return {
    id: newId("doc"),
    name: file.name,
    type: file.type || "text/plain",
    kind: guessTextKind(file),
    content: text,
  };
}

async function processOneFile(file: File): Promise<ChatAttachment[]> {
  if (file.size > ATTACHMENT_LIMITS.maxRawFileBytes) {
    throw new Error(
      `${file.name} exceeds ${Math.round(ATTACHMENT_LIMITS.maxRawFileBytes / (1024 * 1024))}MB`,
    );
  }

  if (file.type.startsWith("image/")) {
    return [await compressImageFile(file)];
  }
  if (file.type.startsWith("video/")) {
    return extractVideoFrames(file);
  }
  return [await processDocumentOrText(file)];
}

/**
 * Client-side pipeline: images compressed, videos → key frames,
 * docs/text extracted for model context.
 */
export async function processFilesForChat(
  files: File[],
  existingCount = 0,
): Promise<ProcessFilesResult> {
  const errors: string[] = [];
  const attachments: ChatAttachment[] = [];
  const remainingSlots = Math.max(
    0,
    ATTACHMENT_LIMITS.maxFiles - existingCount,
  );

  if (remainingSlots === 0) {
    return {
      attachments: [],
      errors: [`You can attach up to ${ATTACHMENT_LIMITS.maxFiles} items`],
    };
  }

  let imageBudget = ATTACHMENT_LIMITS.maxImages;
  let docCharsUsed = 0;

  for (const file of files) {
    if (attachments.length >= remainingSlots) {
      errors.push(
        `Skipped remaining files — max ${ATTACHMENT_LIMITS.maxFiles}`,
      );
      break;
    }
    try {
      const produced = await processOneFile(file);
      for (const att of produced) {
        if (attachments.length >= remainingSlots) break;

        if (att.kind === "image" || att.kind === "video_frame") {
          if (imageBudget <= 0) {
            errors.push(`Skipped ${att.name} — image/frame limit reached`);
            continue;
          }
          imageBudget -= 1;
          attachments.push(att);
          continue;
        }

        const nextChars = docCharsUsed + att.content.length;
        if (nextChars > ATTACHMENT_LIMITS.maxDocCharsTotal) {
          const room = ATTACHMENT_LIMITS.maxDocCharsTotal - docCharsUsed;
          if (room < 500) {
            errors.push(`Skipped ${att.name} — document budget full`);
            continue;
          }
          att.content = truncateText(att.content, room);
        }
        docCharsUsed += att.content.length;
        attachments.push(att);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to read ${file.name}`;
      errors.push(message);
    }
  }

  return { attachments, errors };
}
