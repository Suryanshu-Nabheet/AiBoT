/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import mammoth from "mammoth";
import JSZip from "jszip";
import type { PDFPageProxy } from "pdfjs-dist";
import { ATTACHMENT_LIMITS } from "@/lib/chat/attachments";

const MAX_PDF_PAGES = 500;

export type PdfImagePage = { pageNumber: number; dataUrl: string };
export type PdfExtractionResult = {
  text: string;
  images: PdfImagePage[];
  skippedImagePages: number[];
};

export type EmbeddedImage = { name: string; type: string; data: Uint8Array };
export type EmbeddedImageExtraction = {
  images: EmbeddedImage[];
  omittedCount: number;
};

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.name.split(".").pop()?.toLowerCase() ?? "";

  switch (fileType) {
    case "txt":
    case "md":
    case "markdown":
    case "json":
    case "csv":
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "py":
    case "java":
    case "go":
    case "rs":
    case "html":
    case "css":
    case "xml":
    case "yaml":
    case "yml":
      return readTextFile(file);
    case "pdf":
      return readPdfTextFile(file);
    case "docx":
      return readDocxFile(file);
    case "doc":
      throw new Error(
        "Legacy .doc files are not supported. Save the file as .docx and upload it again.",
      );
    case "pptx":
      return readPptxFile(file);
    case "xlsx":
      return readXlsxFile(file);
    case "xls":
      throw new Error(
        "Legacy .xls files are not supported. Save the spreadsheet as .xlsx and upload it again.",
      );
    default:
      if (
        file.type.startsWith("text/") ||
        file.type === "application/json" ||
        file.type === "application/xml" ||
        file.type === "application/javascript" ||
        file.type === "application/x-yaml" ||
        file.type.endsWith("+json") ||
        file.type.endsWith("+xml")
      ) {
        return readTextFile(file);
      }
      throw new Error(
        `Unsupported file type: .${fileType || "unknown"} — use PDF, DOCX, PPTX, XLSX, text, image, or video`,
      );
  }
}

export async function extractOfficeImages(
  file: File,
): Promise<EmbeddedImageExtraction> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const prefix =
    extension === "docx"
      ? "word/media/"
      : extension === "pptx"
        ? "ppt/media/"
        : extension === "xlsx"
          ? "xl/media/"
          : null;
  if (!prefix) return { images: [], omittedCount: 0 };

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const imagePaths = Object.keys(zip.files)
    .filter((path) => path.startsWith(prefix) && !zip.files[path].dir)
    .filter((path) => /\.(avif|gif|jpe?g|png|webp|bmp|svg)$/i.test(path))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const results: EmbeddedImage[] = [];
  for (const path of imagePaths.slice(0, ATTACHMENT_LIMITS.maxImages)) {
    const extension = path.split(".").pop()?.toLowerCase() ?? "png";
    const mime = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
    results.push({
      name: path.split("/").pop() ?? path,
      type: mime,
      data: await zip.files[path].async("uint8array"),
    });
  }
  return {
    images: results,
    omittedCount: Math.max(0, imagePaths.length - results.length),
  };
}

function readTextFile(file: File): Promise<string> {
  return file.text();
}

export async function extractPdfContent(
  file: File,
  maxRenderedPages = 0,
): Promise<PdfExtractionResult> {
  let pdfjsLib: typeof import("pdfjs-dist");
  try {
    const moduleUrl = new URL("pdfjs-dist/build/pdf.mjs", import.meta.url);
    // Load PDF.js as a browser ESM asset so Webpack never wraps its exports
    // in an eval-based dynamic chunk (which breaks PDF.js v5 in Next dev).
    pdfjsLib = (await import(
      /* webpackIgnore: true */ moduleUrl.toString()
    )) as typeof import("pdfjs-dist");
  } catch (error) {
    console.error("PDF.js failed to initialize", error);
    throw new Error("The PDF reader could not start. Refresh and try again.");
  }

  return extractPdfContentWithModule(file, pdfjsLib, maxRenderedPages);
}

export async function extractPdfContentWithModule(
  file: File,
  pdfjsLib: typeof import("pdfjs-dist"),
  maxRenderedPages = 0,
): Promise<PdfExtractionResult> {
  if (typeof window !== "undefined" && "Worker" in window) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  let pdf: Awaited<typeof loadingTask.promise> | undefined;

  try {
    pdf = await loadingTask.promise;
    const pageLimit = Math.min(pdf.numPages, MAX_PDF_PAGES);
    const maxChars = ATTACHMENT_LIMITS.maxDocCharsPerFile + 1;
    const textParts: string[] = [];
    const images: PdfImagePage[] = [];
    const skippedImagePages: number[] = [];
    let textChars = 0;
    let textWasTruncated = false;

    for (let i = 1; i <= pageLimit; i++) {
      const page = await pdf.getPage(i);
      try {
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        if (pageText.trim()) {
          if (textChars < maxChars) {
            const pageBlock = `--- Page ${i} ---\n${pageText}\n\n`;
            const remaining = maxChars - textChars;
            textParts.push(pageBlock.slice(0, remaining));
            textChars += Math.min(pageBlock.length, remaining);
            if (pageBlock.length > remaining) textWasTruncated = true;
          } else {
            textWasTruncated = true;
          }
        } else if (images.length < maxRenderedPages) {
          const dataUrl = await renderPdfPage(page);
          images.push({ pageNumber: i, dataUrl });
        } else {
          skippedImagePages.push(i);
        }
      } finally {
        page.cleanup();
      }
    }

    let text = textParts.join("").trim();

    if (pdf.numPages > MAX_PDF_PAGES) {
      text += `\n\n[Only the first ${MAX_PDF_PAGES} pages were processed.]`;
    }
    if (textWasTruncated) {
      text += `\n\n[PDF text was truncated at ${ATTACHMENT_LIMITS.maxDocCharsPerFile.toLocaleString()} characters.]`;
    }

    return { text, images, skippedImagePages };
  } finally {
    if (pdf) {
      await pdf.destroy();
    } else {
      await loadingTask.destroy();
    }
  }
}

async function readPdfTextFile(file: File): Promise<string> {
  const result = await extractPdfContent(file);
  if (!result.text) {
    throw new Error(
      "This PDF has no selectable text. Attach it in a chat so its scanned pages can be read by a vision-capable model.",
    );
  }
  return result.text;
}

async function renderPdfPage(page: PDFPageProxy): Promise<string> {
  const viewportAtOne = page.getViewport({ scale: 1 });
  const scale = Math.min(
    1.5,
    ATTACHMENT_LIMITS.maxImageEdge /
      Math.max(viewportAtOne.width, viewportAtOne.height),
  );
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");

  try {
    for (const resize of [1, 0.8, 0.65]) {
      canvas.width = Math.max(1, Math.round(viewport.width * resize));
      canvas.height = Math.max(1, Math.round(viewport.height * resize));
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Could not prepare a canvas for PDF rendering");
      const scaledViewport = page.getViewport({ scale: scale * resize });
      await page.render({
        canvas,
        canvasContext: context,
        viewport: scaledViewport,
      }).promise;

      for (const quality of [ATTACHMENT_LIMITS.jpegQuality, 0.58, 0.44]) {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length <= ATTACHMENT_LIMITS.maxImageDataUrlChars) {
          return dataUrl;
        }
      }
    }
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }

  throw new Error(
    "A scanned PDF page is too large to attach after compression",
  );
}

async function readDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function readPptxFile(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (slideFiles.length === 0) {
    throw new Error("No slides found in PPTX");
  }

  const parts: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("text");
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) =>
      decodeXmlEntities(m[1]),
    );
    const body = texts.join(" ").replace(/\s+/g, " ").trim();
    if (body) parts.push(`--- Slide ${i + 1} ---\n${body}`);
  }

  if (parts.length === 0) {
    throw new Error("PPTX contained no extractable text");
  }
  return parts.join("\n\n");
}

async function readXlsxFile(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const sharedXml = zip.files["xl/sharedStrings.xml"];
  const shared: string[] = [];
  if (sharedXml) {
    const xml = await sharedXml.async("text");
    const siBlocks = xml.match(/<si[\s\S]*?<\/si>/g) ?? [];
    for (const block of siBlocks) {
      const texts = [...block.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) =>
        decodeXmlEntities(m[1]),
      );
      shared.push(texts.join(""));
    }
  }

  const sheetNames = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (sheetNames.length === 0) {
    throw new Error("No worksheets found in spreadsheet");
  }

  const parts: string[] = [];
  for (let i = 0; i < sheetNames.length; i++) {
    const xml = await zip.files[sheetNames[i]].async("text");
    const rows = xml.match(/<row[\s\S]*?<\/row>/g) ?? [];
    const rowLines: string[] = [];
    for (const row of rows) {
      const cells = [...row.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)];
      const values: string[] = [];
      for (const cell of cells) {
        const attrs = cell[1];
        const body = cell[2];
        const typeMatch = /\bt="([^"]+)"/.exec(attrs);
        const type = typeMatch?.[1];
        const vMatch = /<v>([^<]*)<\/v>/.exec(body);
        if (!vMatch) continue;
        const raw = vMatch[1];
        if (type === "s") {
          const idx = Number(raw);
          values.push(shared[idx] ?? raw);
        } else {
          values.push(raw);
        }
      }
      if (values.length) rowLines.push(values.join("\t"));
    }
    if (rowLines.length) {
      parts.push(`--- Sheet ${i + 1} ---\n${rowLines.join("\n")}`);
    }
  }

  if (parts.length === 0) {
    throw new Error("Spreadsheet contained no extractable cells");
  }
  return parts.join("\n\n");
}
