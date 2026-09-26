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
import {
  extractOfficeImages,
  extractPdfContent,
  extractTextFromFile,
} from "@/lib/file-utils";

export type ProcessFilesResult = {
  attachments: ChatAttachment[];
  errors: string[];
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function truncateText(text: string, max: number) {
  if (text.length <= max) return text;
  const suffix = `\n\n…[truncated — file exceeded ${max.toLocaleString()} characters]`;
  return `${text.slice(0, Math.max(0, max - suffix.length))}${suffix}`;
}

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(avif|gif|jpe?g|png|webp|bmp|svg)$/i.test(file.name)
  );
}

function isVideoFile(file: File) {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)
  );
}

async function compressImageFile(file: File): Promise<ChatAttachment> {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      `Could not read image ${file.name}. Try exporting it as PNG or JPEG.`,
    );
  }
  const maxEdge = ATTACHMENT_LIMITS.maxImageEdge;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  try {
    for (const resize of [1, 0.85, 0.7, 0.55]) {
      const targetWidth = Math.max(1, Math.round(width * resize));
      const targetHeight = Math.max(1, Math.round(height * resize));
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not prepare image canvas");
      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      for (const quality of [ATTACHMENT_LIMITS.jpegQuality, 0.6, 0.48, 0.38]) {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length <= ATTACHMENT_LIMITS.maxImageDataUrlChars) {
          return {
            id: newId("img"),
            name: file.name.replace(/\.\w+$/, "") + ".jpg",
            type: "image/jpeg",
            kind: "image",
            content: dataUrl,
          };
        }
      }
    }
    throw new Error(
      `Image ${file.name} is too large to send after compression. Resize it and try again.`,
    );
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}

function loadVideoElement(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      reject(new Error(`Could not load video ${file.name}`));
    };
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      reject(new Error("Video seek failed"));
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    const target = Math.min(
      Math.max(0, time),
      Math.max(0, (video.duration || 1) - 0.05),
    );
    video.currentTime = target;
  });
}

async function extractVideoFrames(
  file: File,
  maxFrames: number,
): Promise<ChatAttachment[]> {
  if (maxFrames <= 0) {
    throw new Error(
      `${file.name} cannot be added because the image limit is full`,
    );
  }
  const video = await loadVideoElement(file);
  const videoUrl = video.src;
  try {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (duration <= 0) {
      throw new Error(`Video ${file.name} has no readable duration`);
    }
    if (duration > ATTACHMENT_LIMITS.maxVideoDurationSec) {
      throw new Error(
        `Video ${file.name} is longer than ${ATTACHMENT_LIMITS.maxVideoDurationSec}s — trim it first`,
      );
    }

    const frameCount = Math.min(
      ATTACHMENT_LIMITS.maxVideoFrames,
      maxFrames,
      Math.max(2, Math.ceil(duration / 8)),
    );
    const canvas = document.createElement("canvas");
    const maxEdge = ATTACHMENT_LIMITS.maxImageEdge;
    const scale = Math.min(
      1,
      maxEdge / Math.max(video.videoWidth || 1, video.videoHeight || 1),
    );
    const baseWidth = Math.max(
      1,
      Math.round((video.videoWidth || 640) * scale),
    );
    const baseHeight = Math.max(
      1,
      Math.round((video.videoHeight || 360) * scale),
    );
    canvas.width = baseWidth;
    canvas.height = baseHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not prepare video canvas");
    }

    const frames: ChatAttachment[] = [];
    for (let i = 0; i < frameCount; i++) {
      const t =
        frameCount === 1 ? duration / 2 : (duration * i) / (frameCount - 1);
      await seekVideo(video, t);
      let dataUrl: string | undefined;
      for (const resize of [1, 0.8, 0.65, 0.5]) {
        canvas.width = Math.max(1, Math.round(baseWidth * resize));
        canvas.height = Math.max(1, Math.round(baseHeight * resize));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.72, 0.6, 0.48, 0.38]) {
          const candidate = canvas.toDataURL("image/jpeg", quality);
          if (candidate.length <= ATTACHMENT_LIMITS.maxImageDataUrlChars) {
            dataUrl = candidate;
            break;
          }
        }
        if (dataUrl) break;
      }
      if (!dataUrl) {
        throw new Error(`A frame from ${file.name} is too large to send`);
      }
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

    return frames;
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(videoUrl);
  }
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

async function processDocumentOrText(
  file: File,
  maxImages: number,
  warnings: string[],
): Promise<ChatAttachment[]> {
  let text = "";
  let textError: unknown;
  try {
    text = await extractTextFromFile(file);
  } catch (error) {
    textError = error;
  }

  let officeImages: Awaited<ReturnType<typeof extractOfficeImages>>["images"] =
    [];
  let omittedCount = 0;
  try {
    const extracted = await extractOfficeImages(file);
    officeImages = extracted.images;
    omittedCount = extracted.omittedCount;
  } catch (error) {
    warnings.push(
      `${file.name}: embedded images could not be read${error instanceof Error ? ` (${error.message})` : ""}`,
    );
  }
  const imageAttachments: ChatAttachment[] = [];
  for (const image of officeImages.slice(0, maxImages)) {
    const imageBytes = image.data.slice().buffer as ArrayBuffer;
    const imageFile = new File([imageBytes], image.name, { type: image.type });
    try {
      imageAttachments.push(await compressImageFile(imageFile));
    } catch (error) {
      warnings.push(
        `${file.name}: could not process embedded image ${image.name}${error instanceof Error ? ` (${error.message})` : ""}`,
      );
    }
  }

  const attachments: ChatAttachment[] = [];
  text = truncateText(text, ATTACHMENT_LIMITS.maxDocCharsPerFile);
  if (text.trim()) {
    attachments.push({
      id: newId("doc"),
      name: file.name,
      type: file.type || "text/plain",
      kind: guessTextKind(file),
      content: text,
    });
  }
  attachments.push(...imageAttachments);

  if (attachments.length === 0) {
    if (textError instanceof Error) throw textError;
    throw new Error(
      `${file.name} has no extractable text or embedded images. Try exporting it as PDF or an image, then upload it with a vision-capable model.`,
    );
  }
  const omittedImageCount =
    omittedCount + officeImages.length - imageAttachments.length;
  if (omittedImageCount > 0 && attachments[0]) {
    attachments[0].content += `\n\n[${omittedImageCount} embedded image(s) omitted because image limits were reached.]`;
  }
  return attachments;
}

async function processPdfFile(
  file: File,
  maxRenderedPages: number,
  maxAttachments: number,
  warnings: string[],
): Promise<ChatAttachment[]> {
  const result = await extractPdfContent(file, maxRenderedPages);
  const attachments: ChatAttachment[] = [];

  if (result.text) {
    const skippedNote = result.skippedImagePages.length
      ? `\n\n[Scanned pages ${result.skippedImagePages.join(", ")} were omitted because the image attachment limit was reached.]`
      : "";
    attachments.push({
      id: newId("pdf"),
      name: file.name,
      type: "application/pdf",
      kind: "document",
      content: result.text + skippedNote,
    });
  }

  const availableImageSlots = Math.max(
    0,
    maxAttachments - (result.text ? 1 : 0),
  );
  const includedImages = result.images.slice(0, availableImageSlots);
  const omittedPages = [
    ...result.skippedImagePages,
    ...result.images.slice(availableImageSlots).map((page) => page.pageNumber),
  ];
  if (result.text && omittedPages.length && attachments[0]) {
    attachments[0].content += `\n\n[Scanned pages ${omittedPages.join(", ")} were omitted because the attachment limit was reached.]`;
  }
  if (omittedPages.length) {
    warnings.push(
      `${file.name}: ${omittedPages.length} scanned page(s) could not be attached because image or file limits were reached.`,
    );
  }

  for (const page of includedImages) {
    attachments.push({
      id: newId("pdf-page"),
      name: `${file.name} · page ${page.pageNumber}`,
      type: "image/jpeg",
      kind: "image",
      content: page.dataUrl,
      note: `Scanned page ${page.pageNumber} from ${file.name}. Read the page visually and extract its text and layout.`,
    });
  }

  if (attachments.length === 0) {
    throw new Error(
      result.skippedImagePages.length
        ? `${file.name} contains scanned pages, but the image attachment limit is full. Remove an image or video attachment and retry.`
        : `${file.name} contains no selectable text or readable page images.`,
    );
  }

  return attachments;
}

async function processOneFile(
  file: File,
  maxPdfPages: number,
  maxImages: number,
  maxAttachments: number,
  warnings: string[],
): Promise<ChatAttachment[]> {
  if (file.size === 0) throw new Error(`${file.name} is empty`);
  if (file.size > ATTACHMENT_LIMITS.maxRawFileBytes) {
    throw new Error(
      `${file.name} exceeds ${Math.round(ATTACHMENT_LIMITS.maxRawFileBytes / (1024 * 1024))}MB`,
    );
  }

  if (isImageFile(file)) {
    return [await compressImageFile(file)];
  }
  if (isVideoFile(file)) {
    return extractVideoFrames(file, Math.min(maxImages, maxAttachments));
  }
  if (file.name.toLowerCase().endsWith(".pdf")) {
    return processPdfFile(file, maxPdfPages, maxAttachments, warnings);
  }
  return processDocumentOrText(file, maxImages, warnings);
}

/**
 * Client-side pipeline: images compressed, videos → key frames,
 * docs/text extracted for model context.
 */
export async function processFilesForChat(
  files: File[],
  existing: number | readonly ChatAttachment[] = 0,
): Promise<ProcessFilesResult> {
  const errors: string[] = [];
  const attachments: ChatAttachment[] = [];
  const existingAttachments = typeof existing === "number" ? [] : existing;
  const existingCount =
    typeof existing === "number" ? existing : existing.length;
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

  let imageBudget = Math.max(
    0,
    ATTACHMENT_LIMITS.maxImages -
      existingAttachments.filter(
        (att) => att.kind === "image" || att.kind === "video_frame",
      ).length,
  );
  let docCharsUsed = existingAttachments
    .filter((att) => att.kind === "document" || att.kind === "text")
    .reduce((sum, att) => sum + att.content.length, 0);

  for (const file of files) {
    if (attachments.length >= remainingSlots) {
      errors.push(
        `Skipped remaining files — max ${ATTACHMENT_LIMITS.maxFiles}`,
      );
      break;
    }
    try {
      const warnings: string[] = [];
      const produced = await processOneFile(
        file,
        Math.min(imageBudget, remainingSlots - attachments.length),
        imageBudget,
        remainingSlots - attachments.length,
        warnings,
      );
      errors.push(...warnings);
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
      errors.push(
        message.includes(file.name) ? message : `${file.name}: ${message}`,
      );
    }
  }

  return { attachments, errors };
}
